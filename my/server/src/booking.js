// Server copy of the pricing and availability rules from src/data/tourInfo.js.
// The server never trusts prices or dates sent by the browser — it recalculates them here.

export const MAX_GUESTS = 12
const GROUP_DISCOUNT_FROM = 5
const GROUP_DISCOUNT = 0.1
const MIN_LEAD_DAYS = 1 // one day less than the site shows, to tolerate time-zone differences
const BOOKING_HORIZON_DAYS = 366

const SEASONS = { summer: [6, 7, 8, 9], warm: [5, 6, 7, 8, 9, 10] }
const TOUR_SEASON = {
  'son-kul': 'summer', 'chatyr-kul': 'summer', 'kel-suu': 'summer', 'ala-kul': 'summer',
  'tash-rabat': 'warm', 'pio-peak': 'summer', 'song-kul-horse': 'summer', 'horse-steppe': 'summer',
  'sary-chet': 'warm', 'asan-basky': 'warm', 'seren-peak': 'summer', 'mountain-bike': 'warm',
  'altyn-arashan': 'warm', 'rafting-chui': 'warm', paragliding: 'warm', 'sary-chelek': 'warm',
  'lenin-trail': 'summer', jyrgalan: 'warm', arslanbob: 'warm', 'kara-mazar': 'warm',
  barskoon: 'warm', 'myn-tala': 'warm', toraygyr: 'warm',
}

export const baseDaysOf = (place) => Math.max(1, Number.parseInt(String(place?.duration || '1').match(/\d+/)?.[0] || '1', 10))

const extraDayPrice = (place) => Math.round(((Number(place.price) || 0) / baseDaysOf(place)) * 0.7 / 50) * 50

export function allowedDays(place) {
  const base = baseDaysOf(place)
  return [base, base + 1, base + 2].filter((d) => d <= Math.max(7, base))
}

export function priceFor(place, guests, days) {
  const base = baseDaysOf(place)
  const perPerson = (Number(place.price) || 0) + Math.max(0, days - base) * extraDayPrice(place)
  const subtotal = perPerson * guests
  const discount = guests >= GROUP_DISCOUNT_FROM ? Math.round(subtotal * GROUP_DISCOUNT) : 0
  return { perPerson, subtotal, discount, total: subtotal - discount }
}

const hash = (text) => {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0
  return h
}

const departureDays = (days) => (days >= 3 ? [1, 4, 6] : days === 2 ? [2, 4, 6, 0] : [0, 1, 2, 3, 4, 5, 6])

const preBookedSeats = (placeId, key) => {
  const h = hash(`${placeId}:${key}`) % 100
  if (h < 8) return MAX_GUESTS
  return h % 9
}

/** Free seats on a date, or 0 when the tour does not run that day. bookedOnSite = seats sold through this API. */
export function seatsLeft(place, key, bookedOnSite = 0, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '')
  if (!m) return 0
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (date.getMonth() !== Number(m[2]) - 1) return 0 // e.g. 2026-02-31
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + MIN_LEAD_DAYS)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + BOOKING_HORIZON_DAYS)
  if (date < start || date > end) return 0
  const season = SEASONS[TOUR_SEASON[place._id]]
  if (season && !season.includes(date.getMonth() + 1)) return 0
  if (!departureDays(baseDaysOf(place)).includes(date.getDay())) return 0
  return Math.max(0, MAX_GUESTS - preBookedSeats(place._id, key) - bookedOnSite)
}
