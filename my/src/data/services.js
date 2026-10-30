import axios from 'axios'

// Local copies of tour photos (bundled by Vite), keyed by Unsplash photo id.
const tourImages = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/tours/*.jpg', { eager: true, query: '?url', import: 'default' }))
    .map(([file, url]) => [file.split('/').pop().replace(/\.jpg$/, ''), url]),
)

const productionApiUrl = 'https://my-project-travel-kg.onrender.com/api'
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const pointsToLocalApi = configuredApiUrl && (/^(\/api)?\/?$/i.test(configuredApiUrl) || /localhost|127\.0\.0\.1/i.test(configuredApiUrl))
// In production a local API address can never work, so fall back to the deployed backend.
const apiBaseUrl = import.meta.env.PROD && pointsToLocalApi
  ? productionApiUrl
  : configuredApiUrl || (import.meta.env.PROD ? productionApiUrl : '/api')

export const api = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })

// Prefer the bundled photo when we have one; otherwise use the URL as is.
export const resolveAssetUrl = (source) => {
  if (!source) return ''
  const photoId = source.match(/photo-\d+-[A-Za-z0-9]+/i)?.[0]
  if (photoId && tourImages[photoId]) return tourImages[photoId]
  if (/^(https?:|data:|blob:)/i.test(source)) return source
  return `${import.meta.env.BASE_URL}${source.replace(/^\/+/, '')}`
}

export const getToken = () => localStorage.getItem('travel-token')
export const setToken = token => token ? localStorage.setItem('travel-token', token) : localStorage.removeItem('travel-token')

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A static host answers unknown /api paths with index.html — treat that as "API unavailable".
api.interceptors.response.use(response => {
  if (response.headers['content-type']?.includes('text/html')) {
    return Promise.reject(new Error('Travel KG API is not connected. Set VITE_API_URL to the deployed backend URL.'))
  }
  return response
})
