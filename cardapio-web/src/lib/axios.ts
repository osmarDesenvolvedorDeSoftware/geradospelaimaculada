import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: { 'Content-Type': 'application/json' },
})

// Injeta o token JWT automaticamente nas requisições autenticadas.
// Rotas do painel (/restaurant/, /auth/) usam restaurant_token.
// Rotas do membro (/members/) usam member_token.
// Rotas do cliente (/orders) usam member_token se disponível.
api.interceptors.request.use((config) => {
    const url = config.url ?? ''
    const restaurantToken = localStorage.getItem('restaurant_token')
    const memberToken = localStorage.getItem('member_token')

    if (url.startsWith('/restaurant') || url.startsWith('/auth')) {
        if (restaurantToken) config.headers.Authorization = `Bearer ${restaurantToken}`
    } else if (url.startsWith('/members')) {
        if (memberToken) config.headers.Authorization = `Bearer ${memberToken}`
    } else {
        // Rotas públicas com suporte opcional a membro (/orders, /menu, etc.)
        const token = memberToken || restaurantToken
        if (token) config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api
