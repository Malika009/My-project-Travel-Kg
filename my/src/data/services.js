import axios from 'axios'
const apiBase=import.meta.env.VITE_API_URL||'/api'
export const api=axios.create({baseURL:apiBase,timeout:10000})
export const resolveAssetUrl=(source)=>{
  if(!source)return ''
  if(/^(https?:|data:|blob:)/i.test(source))return source
  return new URL(source.startsWith('/')?source:`/${source}`,window.location.origin).href
}
export const getToken=()=>localStorage.getItem('travel-token')
export const setToken=token=>token?localStorage.setItem('travel-token',token):localStorage.removeItem('travel-token')
api.interceptors.request.use(config=>{const token=getToken();if(token)config.headers.Authorization=`Bearer ${token}`;return config})
