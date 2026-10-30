import axios from 'axios'
const tourImages=import.meta.glob('../assets/tours/*.jpg')
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'/api',timeout:10000})
export const resolveAssetUrl=(source)=>{
  if(!source)return ''
  const photoId=source.match(/photo-\d+-[A-Za-z0-9]+/i)?.[0]
  const fileName=photoId?`${photoId}.jpg`:''
  if(fileName&&tourImages[`../assets/tours/${fileName}`]){
    return new URL(`${import.meta.env.BASE_URL}tours/${fileName}`,window.location.origin).href
  }
  if(/^(https?:|data:|blob:)/i.test(source))return source
  return new URL(`${import.meta.env.BASE_URL}${source.replace(/^\/+/, '')}`,window.location.origin).href
}
export {api}
export const getToken=()=>localStorage.getItem('travel-token')
export const setToken=token=>token?localStorage.setItem('travel-token',token):localStorage.removeItem('travel-token')
api.interceptors.request.use(config=>{const token=getToken();if(token)config.headers.Authorization=`Bearer ${token}`;return config})
api.interceptors.response.use(response=>{
  if(response.headers['content-type']?.includes('text/html')){
    return Promise.reject(new Error('Travel KG API is not connected. Set VITE_API_URL to the deployed backend URL.'))
  }
  return response
})
