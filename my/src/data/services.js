import axios from 'axios'
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:4000/api',timeout:10000})
export const getToken=()=>localStorage.getItem('travel-token')
export const setToken=token=>token?localStorage.setItem('travel-token',token):localStorage.removeItem('travel-token')
api.interceptors.request.use(config=>{const token=getToken();if(token)config.headers.Authorization=`Bearer ${token}`;return config})
