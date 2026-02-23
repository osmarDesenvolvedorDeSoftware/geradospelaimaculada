import api from '@/lib/axios'

export interface Category {
    id: string
    name: string
    description?: string
    active: boolean
    items: Item[]
}

export interface Item {
    id: string
    name: string
    description?: string
    price: number
    image_url?: string
    active: boolean
    category_id: string
}

export interface OrderItemCreate {
    item_id: string
    quantity: number
}

export interface OrderCreate {
    session_id: string
    table_number: number
    customer_name: string
    observations?: string
    items: OrderItemCreate[]
}

export interface Order {
    id: string
    session_id: string
    table_number: number
    customer_name: string
    observations?: string
    status: string
    total: number
    pix_payload?: string
    created_at: string
    updated_at: string
    items: OrderItem[]
}

export interface OrderItem {
    id: string
    item_id: string
    quantity: number
    unit_price: number
    item_name?: string
}

export const menuApi = {
    getMenu: () => api.get<Category[]>('/menu').then((r) => r.data),
}

export const orderApi = {
    createOrder: (data: OrderCreate) =>
        api.post<Order>('/orders', data).then((r) => r.data),

    getOrder: (orderId: string) =>
        api.get<Order>(`/orders/${orderId}`).then((r) => r.data),

    getOrdersBySession: (sessionId: string) =>
        api.get<Order[]>(`/orders/session/${sessionId}`).then((r) => r.data),

    declarePayment: (orderId: string) =>
        api.post<Order>(`/orders/${orderId}/declare-payment`).then((r) => r.data),

    updateStatus: (orderId: string, status: string) =>
        api.patch<Order>(`/orders/${orderId}/status`, { status }).then((r) => r.data),
}

export const restaurantApi = {
    login: (username: string, password: string) => {
        const form = new FormData()
        form.append('username', username)
        form.append('password', password)
        return api.post<{ access_token: string; token_type: string }>(
            '/auth/login',
            form,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        ).then((r) => r.data)
    },

    getActiveOrders: () =>
        api.get<Order[]>('/restaurant/orders').then((r) => r.data),

    getHistory: (filters: { start_date?: string; end_date?: string; customer_name?: string }) =>
        api.get<Order[]>('/restaurant/history', { params: filters }).then((r) => r.data),
}

export const adminApi = {
    // Categorias
    getCategories: () =>
        api.get<Category[]>('/categories').then((r) => r.data),

    createCategory: (data: { name: string; description?: string }) =>
        api.post<Category>('/categories', data).then((r) => r.data),

    updateCategory: (id: string, data: { name?: string; description?: string; active?: boolean }) =>
        api.put<Category>(`/categories/${id}`, data).then((r) => r.data),

    deleteCategory: (id: string) =>
        api.delete(`/categories/${id}`),

    // Itens
    getItems: () =>
        api.get<Item[]>('/items').then((r) => r.data),

    createItem: (data: {
        name: string
        category_id: string
        price: number
        description?: string
        image_url?: string
    }) => api.post<Item>('/items', data).then((r) => r.data),

    updateItem: (id: string, data: Partial<{
        name: string
        category_id: string
        price: number
        description: string
        image_url: string
        active: boolean
    }>) => api.put<Item>(`/items/${id}`, data).then((r) => r.data),

    deleteItem: (id: string) =>
        api.delete(`/items/${id}`),
}

