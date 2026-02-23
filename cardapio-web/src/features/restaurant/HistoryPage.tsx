import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Calendar, User } from 'lucide-react'
import { restaurantApi } from '@/services/api'

export default function HistoryPage() {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [customerName, setCustomerName] = useState('')

    // Estado para disparar a busca apenas quando clicar ou mudar filtros significativos
    const [searchTrigger, setSearchTrigger] = useState(0)

    const { data: orders, isLoading } = useQuery({
        queryKey: ['restaurant-history', searchTrigger],
        queryFn: () => {
            const params: any = {}
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate
            if (customerName) params.customer_name = customerName
            return restaurantApi.getHistory(params)
        },
    })

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setSearchTrigger((prev) => prev + 1)
    }

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString('pt-BR')

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Search size={20} className="text-gray-400" />
                    Filtrar Histórico
                </h2>

                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Nome..."
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary py-2 px-6 rounded-xl flex items-center justify-center gap-2"
                    >
                        <Search size={18} />
                        Buscar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Mesa</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Itens</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : orders?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        Nenhum pedido encontrado.
                                    </td>
                                </tr>
                            ) : (
                                orders?.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {order.table_number}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">
                                            {order.customer_name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={order.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}>
                                            {order.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {formatCurrency(order.total)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'entregue' ? 'bg-green-100 text-green-700' :
                                                order.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {order.status === 'entregue' ? 'Concluído' :
                                                    order.status === 'cancelado' ? 'Cancelado' :
                                                        order.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
