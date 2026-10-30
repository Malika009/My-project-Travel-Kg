import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedPlaces, ADDED_V2, ADDED_V3, FIXES_V3 } from './seed.js'
import { MAX_GUESTS, allowedDays, baseDaysOf, priceFor, seatsLeft } from './booking.js'

const app = express()
const port = process.env.PORT || 4000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// STORE_FILE lets tests run against a copy of the data.
const dbFile = process.env.STORE_FILE ? path.resolve(process.env.STORE_FILE) : path.resolve(__dirname, '../data/store.json')
const SEED_VERSION = 3
const DEV_SECRET = 'development-only-secret-change-me'
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@travelkg.kg').toLowerCase()
if (JWT_SECRET === DEV_SECRET) console.warn('⚠ JWT_SECRET is not set — using an insecure development secret.')

app.set('trust proxy', 1)

// Local dev on any port, plus the published site(s); extra ones via CLIENT_URL (comma-separated).
const allowedOrigins = new Set(['https://travelkg.uk', 'https://www.travelkg.uk', ...String(process.env.CLIENT_URL || '').split(',').map(x => x.trim().replace(/\/+$/, '')).filter(Boolean)])
const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    callback(null, true)
    return
  }
  callback(new Error('CORS origin not allowed'))
}
app.use(cors({ origin: corsOrigin, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json({ limit: '1mb' }))

// Every error carries a stable `code` so the site can show it in the visitor's language.
const fail = (res, status, code, message) => res.status(status).json({ code, message })

// ---------- rate limiting (in memory, per IP) ----------
const hits = new Map()
const limit = (max, windowMs = 60_000) => (req, res, next) => {
  const key = `${req.path}:${req.ip}`
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.reset < now) hits.set(key, { count: 1, reset: now + windowMs })
  else if (++entry.count > max) return fail(res, 429, 'TOO_MANY', 'Слишком много запросов')
  next()
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k) }, 60_000).unref()

// ---------- storage: MongoDB or a JSON file ----------
const placeSchema = new mongoose.Schema({ _id: String, name: { type: String, required: true, trim: true, minlength: 3 }, region: { type: String, required: true }, category: { type: String, required: true }, rating: { type: Number, min: 0, max: 5, default: 4.8 }, price: { type: Number, min: 0, required: true }, duration: { type: String, required: true }, difficulty: { type: String, default: 'Средне' }, image: { type: String, required: true }, description: { type: String, required: true }, tag: String, translations: { type: mongoose.Schema.Types.Mixed, default: undefined } }, { timestamps: true })
const userSchema = new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, password: { type: String, required: true, minlength: 6 }, role: { type: String, enum: ['user', 'admin'], default: 'user' } }, { timestamps: true })
const orderSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, code: String, contact: { name: String, phone: String, email: String, comment: String }, lang: String, items: [{ placeId: String, name: String, date: String, quantity: Number, days: Number, price: Number, total: Number }], total: { type: Number, required: true, min: 0 }, status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' } }, { timestamps: true })
const reviewSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, userName: String, placeId: { type: String, required: true }, rating: { type: Number, min: 1, max: 5, required: true }, text: { type: String, required: true, minlength: 5, maxlength: 1000 } }, { timestamps: true })
const messageSchema = new mongoose.Schema({ name: String, contact: String, message: String }, { timestamps: true })
let Place, User, Order, Review, Message, mongoMode = false

const emptyStore = () => ({ users: [], places: seedPlaces, orders: [], reviews: [], messages: [], seedVersion: SEED_VERSION })
async function readStore() {
  try {
    const data = JSON.parse(await readFile(dbFile, 'utf8'))
    return { users: [], places: [], orders: [], reviews: [], messages: [], ...data }
  } catch {
    return emptyStore()
  }
}
async function writeStore(data) {
  await mkdir(path.dirname(dbFile), { recursive: true })
  const tmp = `${dbFile}.tmp`
  await writeFile(tmp, JSON.stringify(data, null, 2))
  await rename(tmp, dbFile) // atomic replace: a crash never leaves a half-written file
}
// Serialises read-modify-write cycles so two requests can't overwrite each other's changes.
let queue = Promise.resolve()
const withStore = (fn) => {
  const run = queue.then(async () => {
    const db = await readStore()
    const result = await fn(db)
    await writeStore(db)
    return result
  })
  queue = run.catch(() => {})
  return run
}
const newId = () => new mongoose.Types.ObjectId().toString()
const nowIso = () => new Date().toISOString()

async function all(model, key) {
  return mongoMode ? model.find().sort({ createdAt: -1 }).lean() : (await readStore())[key] || []
}
async function getPlace(id) {
  return mongoMode ? Place.findById(id).lean() : (await readStore()).places.find(x => x._id === id)
}
const userNames = async () => {
  const users = mongoMode ? await User.find({}, 'name').lean() : (await readStore()).users
  return Object.fromEntries(users.map(u => [String(u._id), u.name]))
}

// ---------- auth ----------
const tokenFor = u => jwt.sign({ id: String(u._id), role: u.role }, JWT_SECRET, { expiresIn: '7d' })
const publicUser = u => ({ _id: String(u._id), name: u.name, email: u.email, role: u.role })

async function loadUser(req) {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/, '')
  if (!raw) return null
  const data = jwt.verify(raw, JWT_SECRET)
  return mongoMode ? User.findById(data.id) : (await readStore()).users.find(u => u._id === data.id)
}
async function auth(req, res, next) {
  try {
    if (!req.headers.authorization) return fail(res, 401, 'UNAUTHORIZED', 'Войдите в аккаунт')
    req.user = await loadUser(req)
    if (!req.user) return fail(res, 401, 'USER_NOT_FOUND', 'Пользователь не найден')
    next()
  } catch {
    return fail(res, 401, 'SESSION_EXPIRED', 'Сессия истекла. Войдите снова.')
  }
}
// Like auth, but lets guests through (used for booking without an account).
async function optionalAuth(req, res, next) {
  try { req.user = await loadUser(req) } catch { req.user = null }
  next()
}
const admin = (req, res, next) => req.user?.role === 'admin' ? next() : fail(res, 403, 'FORBIDDEN', 'Требуются права администратора')

app.get('/api/health', (req, res) => res.json({ ok: true, storage: mongoMode ? 'mongodb' : 'json' }))

// ---------- OAuth (Google / GitHub) ----------
const oauthConfig = {
  google: { clientIdVar: 'GOOGLE_CLIENT_ID', clientSecretVar: 'GOOGLE_CLIENT_SECRET', callbackUrl: 'http://localhost:5173/auth/oauth/google', docsUrl: 'https://developers.google.com/identity/protocols/oauth2', scope: 'openid email profile' },
  github: { clientIdVar: 'GITHUB_CLIENT_ID', clientSecretVar: 'GITHUB_CLIENT_SECRET', callbackUrl: 'http://localhost:5173/auth/oauth/github', docsUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps', scope: 'user:email' },
}
async function createSocialUserFromProfile(provider, profile) {
  const email = String(profile.email || `${provider}-${profile.id}@travelkg.local`).trim().toLowerCase()
  const name = String(profile.name || profile.login || 'Travel Guest').trim()
  const existing = mongoMode ? await User.findOne({ email }) : (await readStore()).users.find(u => u.email === email)
  if (existing) return existing
  const password = await bcrypt.hash(`${provider}-${profile.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`, 10)
  const user = { _id: newId(), name: name || 'Travel Guest', email, password, role: email === ADMIN_EMAIL ? 'admin' : 'user' }
  if (mongoMode) return new User(user).save()
  return withStore(db => { db.users.unshift({ ...user, createdAt: nowIso() }); return user })
}
async function getOAuthProfile(provider, code) {
  const config = oauthConfig[provider]
  if (!config) throw Object.assign(new Error('Unknown OAuth provider'), { code: 'OAUTH_FAILED' })
  const clientId = process.env[config.clientIdVar], clientSecret = process.env[config.clientSecretVar]
  if (!clientId || !clientSecret) throw Object.assign(new Error('OAuth not configured'), { code: 'OAUTH_NOT_CONFIGURED' })
  const body = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: config.callbackUrl })
  if (provider === 'google') {
    body.set('grant_type', 'authorization_code')
    const token = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })).json()
    if (!token.access_token) throw Object.assign(new Error(token.error_description || 'Google OAuth failed'), { code: 'OAUTH_FAILED' })
    const user = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })).json()
    return { id: String(user.sub || user.id || 'google-user'), email: user.email, name: user.name || user.given_name || 'Google User' }
  }
  const token = await (await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body })).json()
  if (!token.access_token) throw Object.assign(new Error(token.error_description || 'GitHub OAuth failed'), { code: 'OAUTH_FAILED' })
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'travelkg-app' }
  const user = await (await fetch('https://api.github.com/user', { headers })).json()
  let email = user.email
  if (!email) {
    const emails = await (await fetch('https://api.github.com/user/emails', { headers })).json()
    email = (Array.isArray(emails) ? emails.find(e => e.primary) || emails[0] : null)?.email
  }
  return { id: String(user.id), email: email || `${user.login || 'github'}@travelkg.local`, name: user.name || user.login || 'GitHub User' }
}
app.get('/api/auth/oauth/:provider', (req, res) => {
  const config = oauthConfig[req.params.provider]
  if (!config) return fail(res, 400, 'OAUTH_FAILED', 'Неизвестный провайдер OAuth')
  const clientId = process.env[config.clientIdVar], clientSecret = process.env[config.clientSecretVar]
  if (!clientId || !clientSecret) return res.status(400).json({ code: 'OAUTH_NOT_CONFIGURED', provider: req.params.provider, configured: false, callbackUrl: config.callbackUrl, docsUrl: config.docsUrl, envVars: [config.clientIdVar, config.clientSecretVar] })
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: config.callbackUrl, scope: config.scope })
  const authUrl = req.params.provider === 'google'
    ? `https://accounts.google.com/o/oauth2/v2/auth?${q}&response_type=code&access_type=offline&prompt=consent`
    : `https://github.com/login/oauth/authorize?${q}&allow_signup=true`
  res.json({ provider: req.params.provider, configured: true, authUrl, callbackUrl: config.callbackUrl, docsUrl: config.docsUrl })
})
app.get('/api/auth/oauth/:provider/callback', limit(20), async (req, res, next) => {
  try {
    if (!req.query.code) return fail(res, 400, 'OAUTH_FAILED', 'Код OAuth отсутствует')
    const profile = await getOAuthProfile(req.params.provider, String(req.query.code))
    const user = await createSocialUserFromProfile(req.params.provider, profile)
    res.json({ token: tokenFor(user), user: publicUser(user) })
  } catch (e) {
    if (e.code?.startsWith?.('OAUTH')) return fail(res, 400, e.code, e.message)
    next(e)
  }
})

// ---------- places ----------
const PLACE_FIELDS = ['name', 'region', 'category', 'price', 'duration', 'image', 'description', 'rating', 'tag', 'difficulty', 'translations']
const pickPlace = (body) => {
  const out = {}
  for (const k of PLACE_FIELDS) if (body[k] !== undefined) out[k] = body[k]
  if (out.price !== undefined) out.price = Number(out.price)
  if (out.rating !== undefined) out.rating = Math.min(5, Math.max(0, Number(out.rating) || 0))
  if (out.translations && typeof out.translations !== 'object') delete out.translations
  return out
}
const validPlace = (p) => p.name?.trim().length >= 3 && p.region && p.category && p.duration && p.image && p.description && Number.isFinite(p.price) && p.price >= 0

app.get('/api/places', async (req, res, next) => {
  try {
    let data = await all(Place, 'places')
    const { q, region, category, minRating, minPrice, maxPrice, sort } = req.query
    if (q) data = data.filter(p => p.name.toLowerCase().includes(String(q).toLowerCase()))
    if (region) data = data.filter(p => p.region === region)
    if (category) data = data.filter(p => p.category === category)
    if (minRating) data = data.filter(p => p.rating >= Number(minRating))
    if (minPrice) data = data.filter(p => Number(p.price) >= Number(minPrice))
    if (maxPrice) data = data.filter(p => Number(p.price) <= Number(maxPrice))
    if (sort === 'cheap') data = [...data].sort((a, b) => a.price - b.price)
    if (sort === 'expensive') data = [...data].sort((a, b) => b.price - a.price)
    if (sort === 'rating') data = [...data].sort((a, b) => b.rating - a.rating)
    res.json(data)
  } catch (e) { next(e) }
})
app.get('/api/places/:id', async (req, res, next) => {
  try {
    const p = await getPlace(req.params.id)
    return p ? res.json(p) : fail(res, 404, 'PLACE_NOT_FOUND', 'Место не найдено')
  } catch (e) { next(e) }
})
app.post('/api/places', auth, admin, async (req, res, next) => {
  try {
    const place = { difficulty: 'Средне', rating: 4.8, ...pickPlace(req.body), _id: `place-${Date.now()}` }
    place.name = place.name?.trim()
    place.tag = place.tag || place.category
    if (!validPlace(place)) return fail(res, 400, 'PLACE_INVALID', 'Заполните все поля корректно')
    if (mongoMode) return res.status(201).json(await new Place(place).save())
    const saved = await withStore(db => { db.places.unshift({ ...place, createdAt: nowIso() }); return db.places[0] })
    res.status(201).json(saved)
  } catch (e) { next(e) }
})
app.put('/api/places/:id', auth, admin, async (req, res, next) => {
  try {
    const patch = pickPlace(req.body)
    if (mongoMode) {
      const p = await Place.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true })
      return p ? res.json(p) : fail(res, 404, 'PLACE_NOT_FOUND', 'Место не найдено')
    }
    const result = await withStore(db => {
      const i = db.places.findIndex(x => x._id === req.params.id)
      if (i < 0) return null
      const next = { ...db.places[i], ...patch }
      if (!validPlace(next)) return 'invalid'
      db.places[i] = next
      return next
    })
    if (result === 'invalid') return fail(res, 400, 'PLACE_INVALID', 'Заполните все поля корректно')
    return result ? res.json(result) : fail(res, 404, 'PLACE_NOT_FOUND', 'Место не найдено')
  } catch (e) { next(e) }
})
app.delete('/api/places/:id', auth, admin, async (req, res, next) => {
  try {
    if (mongoMode) await Place.findByIdAndDelete(req.params.id)
    else await withStore(db => { db.places = db.places.filter(p => p._id !== req.params.id) })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// ---------- accounts ----------
app.post('/api/auth/register', limit(10), async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email || '') || String(password || '').length < 6) return fail(res, 400, 'REGISTER_INVALID', 'Проверьте имя, email и пароль')
    const normalized = email.trim().toLowerCase()
    const user = { _id: newId(), name: name.trim().slice(0, 80), email: normalized, password: await bcrypt.hash(String(password), 10), role: normalized === ADMIN_EMAIL ? 'admin' : 'user' }
    let saved
    if (mongoMode) {
      if (await User.findOne({ email: normalized })) return fail(res, 409, 'EMAIL_TAKEN', 'Этот email уже зарегистрирован')
      saved = await new User(user).save()
    } else {
      saved = await withStore(db => {
        if (db.users.some(u => u.email === normalized)) return null
        db.users.unshift({ ...user, createdAt: nowIso() })
        return user
      })
      if (!saved) return fail(res, 409, 'EMAIL_TAKEN', 'Этот email уже зарегистрирован')
    }
    res.status(201).json({ token: tokenFor(saved), user: publicUser(saved) })
  } catch (e) { next(e) }
})
app.post('/api/auth/login', limit(15), async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const user = mongoMode ? await User.findOne({ email }) : (await readStore()).users.find(u => u.email === email)
    if (!user || !await bcrypt.compare(String(req.body.password || ''), user.password)) return fail(res, 401, 'INVALID_CREDENTIALS', 'Неверный email или пароль')
    res.json({ token: tokenFor(user), user: publicUser(user) })
  } catch (e) { next(e) }
})
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))

// ---------- availability & orders ----------
const activeOrders = async () => {
  const rows = mongoMode ? await Order.find({ status: { $ne: 'cancelled' } }, 'items').lean() : (await readStore()).orders.filter(o => o.status !== 'cancelled')
  return rows
}
const bookedFor = (orders, placeId) => {
  const map = {}
  for (const o of orders) for (const it of o.items || []) if (it.placeId === placeId && it.date) map[it.date] = (map[it.date] || 0) + Number(it.quantity || 0)
  return map
}

app.get('/api/availability/:placeId', async (req, res, next) => {
  try {
    res.json({ placeId: req.params.placeId, booked: bookedFor(await activeOrders(), req.params.placeId) })
  } catch (e) { next(e) }
})

const ORDER_TEXT = {
  ru: { subject: 'Бронирование Travel KG получено', body: (o) => `Здравствуйте, ${o.contact.name}!\n\nМы получили ваше бронирование ${o.code} на сумму ${o.total} сом. Менеджер свяжется с вами в течение двух часов.\n\nTravel KG` },
  en: { subject: 'Your Travel KG booking has been received', body: (o) => `Hello ${o.contact.name},\n\nWe have received your booking ${o.code} for ${o.total} som. A manager will contact you within two hours.\n\nTravel KG` },
  ky: { subject: 'Travel KG брондоосу кабыл алынды', body: (o) => `Саламатсызбы, ${o.contact.name}!\n\n${o.code} брондооңузду (${o.total} сом) кабыл алдык. Менеджер эки сааттын ичинде сиз менен байланышат.\n\nTravel KG` },
}
const PHONE_RE = /^\+?[\d\s()-]{9,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const makeCode = () => `TKG-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`

app.get('/api/orders', auth, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const uid = String(req.user._id)
    const mine = o => String(o.user?._id || o.user || '') === uid || (o.contact?.email && o.contact.email.toLowerCase() === req.user.email)
    let rows
    if (mongoMode) rows = await Order.find(isAdmin ? {} : { $or: [{ user: req.user._id }, { 'contact.email': req.user.email }] }).populate('user', 'name email').sort({ createdAt: -1 }).lean()
    else {
      const db = await readStore()
      const users = Object.fromEntries(db.users.map(u => [u._id, { _id: u._id, name: u.name, email: u.email }]))
      rows = db.orders.filter(o => isAdmin || mine(o)).map(o => ({ ...o, user: users[o.user] || o.user || null })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    }
    res.json(rows)
  } catch (e) { next(e) }
})

app.post('/api/orders', limit(10), optionalAuth, async (req, res, next) => {
  try {
    const { items, contact = {}, lang } = req.body
    if (!Array.isArray(items) || !items.length || items.length > 20) return fail(res, 400, 'ORDER_INVALID', 'Проверьте состав заказа')
    const cleanContact = {
      name: String(contact.name || req.user?.name || '').trim().slice(0, 80),
      phone: String(contact.phone || '').trim().slice(0, 20),
      email: String(contact.email || req.user?.email || '').trim().toLowerCase().slice(0, 120),
      comment: String(contact.comment || '').trim().slice(0, 1000),
    }
    if (cleanContact.name.length < 2 || !PHONE_RE.test(cleanContact.phone) || !EMAIL_RE.test(cleanContact.email)) return fail(res, 400, 'CONTACT_INVALID', 'Проверьте контактные данные')

    // Prices, dates and seats are always recalculated on the server.
    const orders = await activeOrders()
    const lines = []
    const wanted = {}
    for (const raw of items) {
      const place = await getPlace(String(raw.placeId || ''))
      if (!place) return fail(res, 404, 'PLACE_NOT_FOUND', 'Место не найдено')
      const quantity = Number(raw.guests ?? raw.quantity)
      const days = Number(raw.days) || baseDaysOf(place)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_GUESTS || !allowedDays(place).includes(days)) return fail(res, 400, 'ORDER_INVALID', 'Проверьте состав заказа')
      const key = `${place._id}|${raw.date}`
      wanted[key] = (wanted[key] || 0) + quantity
      const free = seatsLeft(place, String(raw.date || ''), bookedFor(orders, place._id)[raw.date] || 0)
      if (!free) return fail(res, 409, 'DATE_UNAVAILABLE', 'Дата недоступна')
      if (wanted[key] > free) return fail(res, 409, 'NOT_ENOUGH_SEATS', 'Недостаточно мест')
      const price = priceFor(place, quantity, days)
      lines.push({ placeId: place._id, name: place.name, date: String(raw.date), quantity, days, price: price.perPerson, total: price.total })
    }
    const order = {
      user: req.user?._id ? String(req.user._id) : undefined,
      code: makeCode(),
      contact: cleanContact,
      lang: ['ru', 'ky', 'en'].includes(lang) ? lang : 'ru',
      items: lines,
      total: lines.reduce((s, l) => s + l.total, 0),
      status: 'pending',
    }
    let saved
    if (mongoMode) saved = (await new Order(order).save()).toObject()
    else saved = await withStore(db => { const row = { _id: newId(), ...order, createdAt: nowIso() }; db.orders.unshift(row); return row })

    if (process.env.SMTP_HOST) {
      const text = ORDER_TEXT[order.lang]
      nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
        .sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: cleanContact.email, subject: text.subject, text: text.body(order) })
        .catch(err => console.error('Email failed:', err.message)) // a mail problem must not cancel the booking
    }
    res.status(201).json(saved)
  } catch (e) { next(e) }
})

app.patch('/api/orders/:id', auth, admin, async (req, res, next) => {
  try {
    if (!['pending', 'confirmed', 'cancelled'].includes(req.body.status)) return fail(res, 400, 'STATUS_INVALID', 'Недопустимый статус')
    if (mongoMode) {
      const o = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
      return o ? res.json(o) : fail(res, 404, 'NOT_FOUND', 'Заказ не найден')
    }
    const o = await withStore(db => { const row = db.orders.find(x => x._id === req.params.id); if (row) row.status = req.body.status; return row })
    return o ? res.json(o) : fail(res, 404, 'NOT_FOUND', 'Заказ не найден')
  } catch (e) { next(e) }
})

// ---------- reviews ----------
app.get('/api/reviews', async (req, res, next) => {
  try {
    const [data, names] = await Promise.all([all(Review, 'reviews'), userNames()])
    const rows = req.query.placeId ? data.filter(x => x.placeId === req.query.placeId) : data
    res.json(rows.map(r => ({ ...r, userName: r.userName || names[String(r.user)] || null })))
  } catch (e) { next(e) }
})
app.post('/api/reviews', limit(10), auth, async (req, res, next) => {
  try {
    const { placeId } = req.body
    const rating = Number(req.body.rating)
    const text = String(req.body.text || '').trim()
    if (!placeId || !Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 5 || text.length > 1000) return fail(res, 400, 'REVIEW_INVALID', 'Оценка от 1 до 5 и отзыв от 5 символов обязательны')
    if (!await getPlace(placeId)) return fail(res, 404, 'PLACE_NOT_FOUND', 'Место не найдено')
    const review = { user: String(req.user._id), userName: req.user.name, placeId, rating, text }
    if (mongoMode) return res.status(201).json(await new Review(review).save())
    res.status(201).json(await withStore(db => { const row = { _id: newId(), ...review, createdAt: nowIso() }; db.reviews.unshift(row); return row }))
  } catch (e) { next(e) }
})
app.delete('/api/reviews/:id', auth, admin, async (req, res, next) => {
  try {
    if (mongoMode) await Review.findByIdAndDelete(req.params.id)
    else await withStore(db => { db.reviews = db.reviews.filter(x => x._id !== req.params.id) })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// ---------- contact form ----------
app.post('/api/messages', limit(5), async (req, res, next) => {
  try {
    const msg = { name: String(req.body.name || '').trim().slice(0, 80), contact: String(req.body.contact || '').trim().slice(0, 120), message: String(req.body.message || '').trim().slice(0, 1500) }
    if (msg.name.length < 2 || msg.contact.length < 5 || msg.message.length < 10) return fail(res, 400, 'MESSAGE_INVALID', 'Заполните все поля')
    if (mongoMode) return res.status(201).json(await new Message(msg).save())
    res.status(201).json(await withStore(db => { const row = { _id: newId(), ...msg, createdAt: nowIso() }; db.messages.unshift(row); return row }))
  } catch (e) { next(e) }
})
app.get('/api/admin/messages', auth, admin, async (req, res, next) => {
  try { res.json(await all(Message, 'messages')) } catch (e) { next(e) }
})

// ---------- users (admin) ----------
app.get('/api/admin/users', auth, admin, async (req, res, next) => {
  try {
    const rows = await all(User, 'users')
    res.json(rows.map(({ _id, name, email, role, createdAt }) => ({ _id, name, email, role, createdAt })))
  } catch (e) { next(e) }
})
app.patch('/api/admin/users/:id', auth, admin, async (req, res, next) => {
  try {
    if (!['user', 'admin'].includes(req.body.role)) return fail(res, 400, 'ROLE_INVALID', 'Недопустимая роль')
    if (mongoMode) {
      const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password')
      return u ? res.json(u) : fail(res, 404, 'USER_NOT_FOUND', 'Пользователь не найден')
    }
    const u = await withStore(db => { const row = db.users.find(x => x._id === req.params.id); if (row) row.role = req.body.role; return row })
    return u ? res.json(publicUser(u)) : fail(res, 404, 'USER_NOT_FOUND', 'Пользователь не найден')
  } catch (e) { next(e) }
})

app.use('/api', (req, res) => fail(res, 404, 'NOT_FOUND', 'Не найдено'))
app.use((err, req, res, _next) => {
  if (err.message === 'CORS origin not allowed') return fail(res, 403, 'FORBIDDEN', err.message)
  if (err.type === 'entity.parse.failed') return fail(res, 400, 'VALIDATION', 'Некорректный JSON')
  console.error(err)
  if (err.name === 'ValidationError' || err.name === 'CastError') return fail(res, 400, 'VALIDATION', 'Проверьте введённые данные')
  if (err.code === 11000) return fail(res, 409, 'EMAIL_TAKEN', 'Такой email уже зарегистрирован')
  fail(res, 500, 'SERVER_ERROR', 'Внутренняя ошибка сервера')
})

// ---------- seed migrations ----------
// v2/v3 add tours introduced in later releases and fix a few facts — each runs once,
// so tours an admin deleted on purpose stay deleted.
async function migrateSeed() {
  const byId = Object.fromEntries(seedPlaces.map(p => [p._id, p]))
  const steps = [[2, ADDED_V2, {}], [3, ADDED_V3, FIXES_V3]]
  if (mongoMode) {
    const meta = mongoose.connection.db.collection('meta')
    const version = (await meta.findOne({ _id: 'seed' }))?.version || 1
    for (const [v, ids, fixes] of steps) {
      if (version >= v) continue
      for (const id of ids) if (!await Place.exists({ _id: id })) await Place.create(byId[id])
      for (const [id, patch] of Object.entries(fixes)) await Place.updateOne({ _id: id }, { $set: patch })
    }
    await meta.updateOne({ _id: 'seed' }, { $set: { version: SEED_VERSION } }, { upsert: true })
    return
  }
  await withStore(db => {
    const version = db.seedVersion || 1
    for (const [v, ids, fixes] of steps) {
      if (version >= v) continue
      for (const id of ids) if (!db.places.some(x => x._id === id)) db.places.push(byId[id])
      for (const [id, patch] of Object.entries(fixes)) { const p = db.places.find(x => x._id === id); if (p) Object.assign(p, patch) }
    }
    db.seedVersion = SEED_VERSION
  })
}

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI)
      Place = mongoose.model('Place', placeSchema)
      User = mongoose.model('User', userSchema)
      Order = mongoose.model('Order', orderSchema)
      Review = mongoose.model('Review', reviewSchema)
      Message = mongoose.model('Message', messageSchema)
      mongoMode = true
      if (await Place.countDocuments() === 0) await Place.insertMany(seedPlaces)
      await migrateSeed()
      console.log('MongoDB connected')
    } catch (err) {
      console.error('MongoDB connection failed; using JSON persistence:', err.message)
      mongoMode = false
    }
  }
  if (!mongoMode) {
    try { await readFile(dbFile) } catch { await writeStore(emptyStore()) }
    await migrateSeed()
  }
  app.listen(port, () => console.log(`Travel KG API listening on http://localhost:${port} (${mongoMode ? 'MongoDB' : 'JSON storage'})`))
}
start()
