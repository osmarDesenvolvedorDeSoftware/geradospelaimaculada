import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogIn, Bell, AlertCircle, ClipboardList, UtensilsCrossed, LogOut, QrCode, Users } from 'lucide-react'
import { restaurantApi, orderApi } from '@/services/api'
import type { Order } from '@/services/api'
import ProductsPage from '@/features/restaurant/ProductsPage'
import LinksPage from '@/features/restaurant/LinksPage'
import HistoryPage from '@/features/restaurant/HistoryPage'
import MembersPage from '@/features/restaurant/MembersPage'

const STATUS_LABELS: Record<string, string> = {
    aguardando_pagamento: 'Aguardando Pagamento',
    pagamento_declarado: 'Pagamento Declarado',
    em_preparacao: 'Em Preparação',
    pronto: 'Pronto',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
    conta: 'Na Conta',
}

const NEXT_STATUS: Record<string, string> = {
    pagamento_declarado: 'em_preparacao',
    em_preparacao: 'pronto',
    pronto: 'entregue',
    conta: 'em_preparacao',
}

const NEXT_STATUS_LABEL: Record<string, string> = {
    pagamento_declarado: 'Confirmar Pagamento',
    em_preparacao: 'Marcar como Pronto',
    pronto: 'Marcar como Entregue',
    conta: 'Confirmar e Enviar à Cozinha',
}

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async () => {
        try {
            const data = await restaurantApi.login(username, password)
            localStorage.setItem('restaurant_token', data.access_token)
            onLogin(data.access_token)
        } catch {
            setError('Usuário ou senha incorretos')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="card w-full max-w-sm p-6 space-y-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Gerados pela imaculada</h1>
                    <p className="text-gray-500 text-sm mt-1">Painel do Restaurante</p>
                </div>
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                <input
                    type="text"
                    placeholder="Usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button onClick={handleLogin} className="w-full btn-primary flex items-center justify-center gap-2">
                    <LogIn size={18} />
                    Entrar
                </button>
            </div>
        </div>
    )
}

function OrderCard({ order }: { order: Order }) {
    const queryClient = useQueryClient()
    const nextStatus = NEXT_STATUS[order.status]
    const isUrgent = order.status === 'pagamento_declarado'

    const mutation = useMutation({
        mutationFn: () => orderApi.updateStatus(order.id, nextStatus),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] }),
    })

    return (
        <div
            className={`card p-4 space-y-3 ${isUrgent ? 'border-2 border-blue-400 bg-blue-50' : ''
                }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-bold text-gray-900">
                        Mesa {order.table_number} · {order.customer_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>
                <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${isUrgent
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'em_preparacao'
                            ? 'bg-orange-100 text-orange-700'
                            : order.status === 'pronto'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                >
                    {STATUS_LABELS[order.status]}
                </span>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
                {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}x {item.item_name || 'Item'}</span>
                        <span>R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                ))}
            </div>



            {
                order.observations && (
                    <div className="bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg text-sm border border-yellow-200">
                        <span className="font-bold">Obs:</span> {order.observations}
                    </div>
                )
            }

            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-900">
                    Total: R$ {order.total.toFixed(2).replace('.', ',')}
                </span>
                {nextStatus && (
                    <button
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                        className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${isUrgent
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                            }`}
                    >
                        {mutation.isPending ? '...' : NEXT_STATUS_LABEL[order.status]}
                    </button>
                )}
                {order.status !== 'entregue' && order.status !== 'cancelado' && (
                    <button
                        onClick={() => {
                            if (confirm('Deseja realmente cancelar este pedido?')) {
                                orderApi.updateStatus(order.id, 'cancelado').then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] })
                                })
                            }
                        }}
                        className="text-xs font-medium text-red-500 hover:text-red-700 underline px-2 py-1"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div >
    )
}

export default function RestaurantPage() {
    const [token, setToken] = useState(localStorage.getItem('restaurant_token') || '')
    const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'links' | 'history' | 'members'>('orders')
    const wsRef = useRef<WebSocket | null>(null)
    const queryClient = useQueryClient()

    const { data: orders, isLoading } = useQuery({
        queryKey: ['restaurant-orders'],
        queryFn: restaurantApi.getActiveOrders,
        enabled: !!token,
        refetchInterval: 10000,
    })

    // Conexão WebSocket para notificações em tempo real
    useEffect(() => {
        if (!token) return
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
        const wsUrl = apiUrl.replace('http', 'ws').replace('/api', '') + '/api/ws/restaurant'
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            if (['novo_pedido', 'pagamento_declarado', 'status_atualizado'].includes(msg.event)) {
                queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] })
                if (msg.event === 'pagamento_declarado') {
                    // Alerta sonoro simples (tela pisca)
                    document.title = `Pix Recebido - Mesa ${msg.data.table_number}`
                    setTimeout(() => (document.title = 'Painel do Restaurante'), 5000)
                }
            }
        }

        return () => ws.close()
    }, [token, queryClient])

    const handleLogout = () => {
        localStorage.removeItem('restaurant_token')
        setToken('')
    }

    if (!token) return <LoginPage onLogin={setToken} />

    const activeOrders = orders?.filter((o) => o.status !== 'entregue') ?? []
    const pendingPayment = activeOrders.filter((o) => o.status === 'pagamento_declarado')

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            {/* Header */}
            <div className="bg-primary-500 text-white px-4 pt-10 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold">Gerados pela imaculada</h1>
                        <p className="text-primary-100 text-sm">Painel do Restaurante · {activeOrders.length} pedido(s) ativo(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingPayment.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-blue-500 px-3 py-1.5 rounded-full">
                                <Bell size={14} />
                                <span className="text-sm font-bold">{pendingPayment.length} Pix</span>
                            </div>
                        )}
                        <button onClick={handleLogout} className="p-2 hover:bg-primary-600 rounded-xl transition-colors" title="Sair">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Abas */}
                <div className="flex bg-primary-600 rounded-xl p-1 gap-1">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-white text-primary-600' : 'text-primary-100'
                            }`}
                    >
                        <ClipboardList size={15} /> Pedidos
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'products' ? 'bg-white text-primary-600' : 'text-primary-100'
                            }`}
                    >
                        <UtensilsCrossed size={15} /> Cardápio
                    </button>
                    <button
                        onClick={() => setActiveTab('links')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'links' ? 'bg-white text-primary-600' : 'text-primary-100'
                            }`}
                    >
                        <QrCode size={15} /> Mesas (QR)
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white text-primary-600' : 'text-primary-100'
                            }`}
                    >
                        <ClipboardList size={15} /> Histórico
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'members' ? 'bg-white text-primary-600' : 'text-primary-100'
                            }`}
                    >
                        <Users size={15} /> Membros
                    </button>
                </div>
            </div>

            <div className="px-4 mt-4">
                {/* Aba Pedidos */}
                {activeTab === 'orders' && (
                    <div className="space-y-3">
                        {isLoading && (
                            <div className="text-center py-12 text-gray-400">
                                <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                Carregando pedidos...
                            </div>
                        )}
                        {!isLoading && activeOrders.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <p className="font-medium">Nenhum pedido ativo no momento</p>
                            </div>
                        )}
                        {pendingPayment.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                        {activeOrders
                            .filter((o) => o.status !== 'pagamento_declarado')
                            .map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                    </div>
                )}

                {/* Aba Cardápio */}
                {activeTab === 'products' && <ProductsPage />}

                {/* Aba Links (QR Codes) */}
                {activeTab === 'links' && <LinksPage />}

                {/* Aba Histórico */}
                {activeTab === 'history' && <HistoryPage />}

                {/* Aba Membros */}
                {activeTab === 'members' && <MembersPage />}
            </div>
        </div>
    )
}
