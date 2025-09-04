import { create } from 'zustand'
import Cookies from 'js-cookie'
import { api } from '@/lib/api'

interface User {
  email: string
  created_at: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  setup: (email: string, password: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.data.ok) {
        const { token, user } = response.data.data
        Cookies.set('auth_token', token, { expires: 7 })
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        set({
          isAuthenticated: true,
          user,
          token
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  },

  logout: () => {
    Cookies.remove('auth_token')
    delete api.defaults.headers.common['Authorization']
    
    set({
      isAuthenticated: false,
      user: null,
      token: null
    })
  },

  checkAuth: async () => {
    const token = Cookies.get('auth_token')
    if (!token) {
      // 没有token时确保认证状态为false
      set({
        isAuthenticated: false,
        user: null,
        token: null
      })
      return
    }

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await api.get('/auth/me')
      
      if (response.data.ok) {
        set({
          isAuthenticated: true,
          user: response.data.data,
          token
        })
      } else {
        get().logout()
      }
    } catch (error) {
      console.log('Auth check failed, logging out')
      get().logout()
    }
  },

  setup: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/setup', { email, password })
      return response.data.ok
    } catch (error) {
      console.error('Setup failed:', error)
      return false
    }
  }
})) 