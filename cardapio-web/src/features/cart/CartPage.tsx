import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useSession, getTableNumber } from '@/hooks/useSession'
import { orderApi } from '@/services/api'

interface Props {
    onBack: () => void
    onOrderCreated: (orderId: string) => void
}

export default function CartPage({ onBack, onOrderCreated }: Props) {
    const { items, updateQuantity, removeItem, clearCart, total } = useCartStore()
    const { sessionId } = useSession()
    const tableNumber = getTableNumber()
    const [customerName, setCustomerName] = useState('')
    const [observations, setObservations] = useState('')

    const mutation = useMutation({
        mutationFn: () =>
            orderApi.createOrder({
                session_id: sessionId,
                table_number: tableNumber,
                customer_name: customerName.trim(),
                observations: observations.trim() || undefined,
                items: items.map((i) => ({ item_id: i.id, quantity: i.quantity })),
            }),
        onSuccess: (order) => {
            localStorage.setItem('cardapio_active_order', order.id)
            clearCart()
            onOrderCreated(order.id)
        },
    })

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="flex items-center gap-3 p-4 bg-white border-b">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-lg">Carrinho</h1>
                </div>
                <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-500">
                    <p className="text-5xl">🛒</p>
                    <p className="font-medium">Seu carrinho está vazio</p>
                    <button onClick={onBack} className="btn-primary mt-2 px-6">
                        Ver cardápio
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-bold text-lg">Carrinho</h1>
            </div>

            <div className="px-4 mt-4 space-y-4">
                {/* Itens */}
                <div className="card divide-y divide-gray-100">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                <p className="text-primary-600 font-bold text-sm mt-0.5">
                                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="bg-gray-100 rounded-full p-1.5 active:bg-gray-200"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="font-bold w-5 text-center">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="bg-primary-500 text-white rounded-full p-1.5"
                                >
                                    <Plus size={14} />
                                </button>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="ml-1 text-red-400 p-1.5"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Identificação e Observações */}
                <div className="card p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Seu nome *
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: João"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            maxLength={50}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Observações <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            placeholder="Ex: Sem cebola, ponto da carne..."
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Footer com total e botão de pedir */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="text-xl font-bold text-gray-900">
                        R$ {total().toFixed(2).replace('.', ',')}
                    </span>
                </div>
                {mutation.isError && (
                    <p className="text-red-500 text-sm text-center">
                        Erro ao criar pedido. Tente novamente.
                    </p>
                )}
                <button
                    onClick={() => mutation.mutate()}
                    disabled={!customerName.trim() || mutation.isPending}
                    className="w-full btn-primary"
                >
                    {mutation.isPending ? 'Enviando pedido...' : '🛒 Fazer Pedido'}
                </button>
            </div>
        </div>
    )
}
