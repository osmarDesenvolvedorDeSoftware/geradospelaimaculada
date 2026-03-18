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

// Trata respostas 401 (token expirado ou inválido): limpa o token armazenado
// e dispara o evento "unauthorized" para que os componentes possam reagir.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url: string = error.config?.url ?? ''
            let tokenType: 'restaurant' | 'member' | null = null
            if (url.startsWith('/restaurant') || url.startsWith('/auth')) {
                localStorage.removeItem('restaurant_token')
                tokenType = 'restaurant'
            } else if (url.startsWith('/members')) {
                localStorage.removeItem('member_token')
                tokenType = 'member'
            }
            if (tokenType) {
                window.dispatchEvent(new CustomEvent('unauthorized', { detail: { tokenType } }))
            }
        }
        return Promise.reject(error)
    }
)

export default api
