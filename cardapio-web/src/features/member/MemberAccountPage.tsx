import { ArrowLeft, LogOut, Receipt, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { memberApi } from '@/services/api'
import type { Order } from '@/services/api'
import { useMemberStore } from '@/store/cartStore'

interface Props {
    onBack: () => void
}

const MONTH_NAMES = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const STATUS_LABEL: Record<string, string> = {
    conta: 'Na conta',
    em_preparacao: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Entregue',
}

export default function MemberAccountPage({ onBack }: Props) {
    const { member, logout } = useMemberStore()

    const { data: tab, isLoading: tabLoading } = useQuery({
        queryKey: ['member-tab'],
        queryFn: memberApi.getCurrentTab,
    })

    const { data: orders = [], isLoading: ordersLoading } = useQuery({
        queryKey: ['member-tab-orders'],
        queryFn: memberApi.getCurrentTabOrders,
    })

    const handleLogout = () => {
        logout()
        onBack()
    }

    const saldo = tab ? tab.total_consumed - tab.total_paid : 0
    const isLoading = tabLoading || ordersLoading

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-base leading-tight">{member?.name}</h1>
                        <p className="text-xs text-gray-400">Membro</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
                >
                    <LogOut size={16} />
                    Sair
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="px-4 py-5 space-y-4">
                    {/* Resumo do mês */}
                    <div className="card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Receipt size={18} className="text-primary-500" />
                            <h2 className="font-bold text-gray-900">
                                {tab ? `${MONTH_NAMES[tab.month]} / ${tab.year}` : 'Conta atual'}
                            </h2>
                            {tab && (
                                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    tab.status === 'paga'
                                        ? 'bg-green-100 text-green-700'
                                        : tab.status === 'parcial'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-orange-100 text-orange-700'
                                }`}>
                                    {tab.status === 'paga' ? 'Quitada' : tab.status === 'parcial' ? 'Parcial' : 'Em aberto'}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">Consumido</p>
                                <p className="text-lg font-bold text-gray-900">
                                    R$ {(tab?.total_consumed ?? 0).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">Já pago</p>
                                <p className="text-lg font-bold text-green-600">
                                    R$ {(tab?.total_paid ?? 0).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>

                        {saldo > 0 && (
                            <div className="mt-3 flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 text-orange-700">
                                    <TrendingDown size={16} />
                                    <span className="text-sm font-medium">Saldo devedor</span>
                                </div>
                                <span className="text-base font-bold text-orange-700">
                                    R$ {saldo.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        )}
                        {saldo <= 0 && tab && (
                            <div className="mt-3 text-center py-2 bg-green-50 rounded-xl text-green-700 text-sm font-medium">
                                Conta quitada!
                            </div>
                        )}
                    </div>

                    {/* Lista de pedidos */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Pedidos lançados na conta
                        </h3>

                        {orders.length === 0 ? (
                            <div className="card p-6 text-center text-gray-400">
                                <p className="text-3xl mb-2">📋</p>
                                <p className="text-sm">Nenhum pedido lançado na conta este mês</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(orders as Order[]).map((order) => (
                                    <div key={order.id} className="card p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                    {' · '}Mesa {order.table_number}
                                                </p>
                                            </div>
                                            <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                                                {STATUS_LABEL[order.status] ?? order.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-600">
                                                        {item.quantity}x {item.item_name}
                                                    </span>
                                                    <span className="text-gray-900 font-medium">
                                                        R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-gray-100 pt-2 flex justify-between">
                                            <span className="text-sm text-gray-500">Subtotal</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                R$ {order.total.toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
