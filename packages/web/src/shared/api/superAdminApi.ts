/// <reference types="vite/client" />
import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ? `${import.meta.env.VITE_API_URL}/api/super-admin`
  : '/api/super-admin'

export const superAdminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

superAdminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('superAdminAccessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

superAdminApi.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('superAdminRefreshToken')
      if (!refreshToken) {
        window.location.href = '/super-admin/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return superAdminApi(original)
        })
      }

      isRefreshing = true
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('superAdminAccessToken', data.accessToken)
        localStorage.setItem('superAdminRefreshToken', data.refreshToken)
        superAdminApi.defaults.headers.Authorization = `Bearer ${data.accessToken}`
        queue.forEach(p => p.resolve(data.accessToken))
        queue = []
        return superAdminApi(original)
      } catch {
        queue.forEach(p => p.reject(error))
        queue = []
        localStorage.removeItem('superAdminAccessToken')
        localStorage.removeItem('superAdminRefreshToken')
        localStorage.removeItem('superAdmin')
        window.location.href = '/super-admin/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default superAdminApi
