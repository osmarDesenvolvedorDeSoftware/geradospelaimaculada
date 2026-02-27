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
    member_price?: number  // defineão de preço de membro (null = sem desconto)
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
    member_id?: string       // preenchido quando membro logado
    payment_method: 'pix' | 'conta'
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
    payment_method: string
    member_id?: string
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
        member_price?: number
        description?: string
        image_url?: string
    }) => api.post<Item>('/items', data).then((r) => r.data),

    updateItem: (id: string, data: Partial<{
        name: string
        category_id: string
        price: number
        member_price: number | null
        description: string
        image_url: string
        active: boolean
    }>) => api.put<Item>(`/items/${id}`, data).then((r) => r.data),

    deleteItem: (id: string) =>
        api.delete(`/items/${id}`),
}

// ─── Interfaces de Membro ─────────────────────────────────────────────────────

export interface Member {
    id: string
    name: string
    email: string
    phone?: string
    is_active: boolean
    created_at: string
}

export interface MemberTab {
    id: string
    member_id: string
    month: number
    year: number
    total_consumed: number
    total_paid: number
    status: 'aberta' | 'parcial' | 'paga'
    closed_at?: string
    notes?: string
}

export interface MemberTabPix {
    pix_payload: string
    qr_code_base64: string
    saldo_devedor: number
    tab_id: string
}

// ─── memberApi (lado do cliente logado) ──────────────────────────────────────

export const memberApi = {
    login: (email: string, password: string) =>
        api.post<{ access_token: string; token_type: string; member: Member }>(
            '/members/login', { email, password }
        ).then((r) => r.data),

    getMe: () =>
        api.get<Member>('/members/me').then((r) => r.data),

    getCurrentTab: () =>
        api.get<MemberTab>('/members/me/tab').then((r) => r.data),

    getCurrentTabOrders: () =>
        api.get<Order[]>('/members/me/tab/orders').then((r) => r.data),

    getTabsHistory: () =>
        api.get<MemberTab[]>('/members/me/tabs').then((r) => r.data),
}

// ─── adminMembersApi (lado do painel do restaurante) ─────────────────────────

export const adminMembersApi = {
    listMembers: () =>
        api.get<Member[]>('/restaurant/members').then((r) => r.data),

    createMember: (data: { name: string; email: string; password: string; phone?: string }) =>
        api.post<Member>('/restaurant/members', data).then((r) => r.data),

    updateMember: (id: string, data: Partial<{ name: string; email: string; phone: string; is_active: boolean; password: string }>) =>
        api.patch<Member>(`/restaurant/members/${id}`, data).then((r) => r.data),

    deleteMember: (id: string) =>
        api.delete(`/restaurant/members/${id}`),

    getMemberTabs: (memberId: string) =>
        api.get<MemberTab[]>(`/restaurant/members/${memberId}/tabs`).then((r) => r.data),

    getTabOrders: (memberId: string, tabId: string) =>
        api.get<Order[]>(`/restaurant/members/${memberId}/tabs/${tabId}/orders`).then((r) => r.data),

    registerPayment: (memberId: string, tabId: string, data: { amount: number; notes?: string }) =>
        api.post<MemberTab>(`/restaurant/members/${memberId}/tabs/${tabId}/pay`, data).then((r) => r.data),

    generatePixForTab: (memberId: string, tabId: string) =>
        api.get<MemberTabPix>(`/restaurant/members/${memberId}/tabs/${tabId}/pix`).then((r) => r.data),
}

