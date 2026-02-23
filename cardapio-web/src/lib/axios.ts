import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: { 'Content-Type': 'application/json' },
})

// Injeta o token JWT automaticamente nas requisições autenticadas
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('restaurant_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api
