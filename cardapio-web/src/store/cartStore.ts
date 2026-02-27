import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '@/services/api'

export interface CartItem {
    id: string
    name: string
    price: number        // preço que foi adicionado (já resolvido: membro ou normal)
    quantity: number
    image_url?: string
}

interface CartStore {
    items: CartItem[]
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    total: () => number
    totalItems: () => number
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (newItem) => {
                set((state) => {
                    const existing = state.items.find((i) => i.id === newItem.id)
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
                            ),
                        }
                    }
                    return { items: [...state.items, { ...newItem, quantity: 1 }] }
                })
            },

            removeItem: (id) =>
                set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

            updateQuantity: (id, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(id)
                    return
                }
                set((state) => ({
                    items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
                }))
            },

            clearCart: () => set({ items: [] }),

            total: () =>
                get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

            totalItems: () =>
                get().items.reduce((sum, item) => sum + item.quantity, 0),
        }),
        { name: 'cardapio_cart' }
    )
)

// ─── Store do Membro logado ───────────────────────────────────────────────────

interface MemberStore {
    member: Member | null
    token: string | null
    login: (member: Member, token: string) => void
    logout: () => void
    isLoggedIn: () => boolean
}

export const useMemberStore = create<MemberStore>()(
    persist(
        (set, get) => ({
            member: null,
            token: null,

            login: (member, token) => {
                set({ member, token })
                // coloca o token num lugar que o axios interceptor já lê se necessário
                localStorage.setItem('member_token', token)
            },

            logout: () => {
                set({ member: null, token: null })
                localStorage.removeItem('member_token')
            },

            isLoggedIn: () => !!get().token && !!get().member,
        }),
        { name: 'cardapio_member' }
    )
)

