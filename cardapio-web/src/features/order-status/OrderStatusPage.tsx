import { useQuery } from '@tanstack/react-query'
import type { Order } from '@/services/api'
import { orderApi } from '@/services/api'
import { CheckCircle, Clock, ChefHat, Bell, Package, MessageCircle } from 'lucide-react'
import React from 'react'

const STATUS_INFO: Record<string, { label: string; icon: React.ReactNode; color: string; description: string }> = {
    aguardando_pagamento: {
        label: 'Aguardando Pagamento',
        icon: <Clock size={40} />,
        color: 'text-yellow-500',
        description: 'Realize o pagamento pelo QR Code Pix.',
    },
    pagamento_declarado: {
        label: 'Pagamento em Verificação',
        icon: <Bell size={40} />,
        color: 'text-blue-500',
        description: 'O restaurante foi avisado e está verificando seu pagamento.',
    },
    em_preparacao: {
        label: 'Em Preparação 🍳',
        icon: <ChefHat size={40} />,
        color: 'text-orange-500',
        description: 'Pagamento confirmado! Seu pedido está sendo preparado.',
    },
    pronto: {
        label: 'Pronto para Retirada! 🍽️',
        icon: <Package size={40} />,
        color: 'text-green-500',
        description: 'Seu pedido está pronto! Seu nome está aparecendo na TV do balcão para retirada.',
    },
    entregue: {
        label: 'Pedido Entregue ✅',
        icon: <CheckCircle size={40} />,
        color: 'text-green-600',
        description: 'Obrigado pela preferência! Bom apetite! 😊',
    },
}

interface Props {
    orderId: string
    onNewOrder: () => void
}

export default function OrderStatusPage({ orderId, onNewOrder }: Props) {
    const { data: order } = useQuery({
        queryKey: ['order', orderId],
        queryFn: () => orderApi.getOrder(orderId),
        refetchInterval: 5000, // polling a cada 5 segundos
    })

    if (!order) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const statusInfo = STATUS_INFO[order.status] ?? STATUS_INFO['aguardando_pagamento']
    const isDelivered = order.status === 'entregue'

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-primary-500 text-white px-4 pt-10 pb-6 text-center">
                <h1 className="text-xl font-bold">Acompanhe seu Pedido</h1>
                <p className="text-primary-100 text-sm mt-1">
                    Mesa {order.table_number} · {order.customer_name}
                </p>
            </div>

            <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
                {/* Status atual */}
                <div className="card w-full p-8 text-center">
                    <div className={`${statusInfo.color} flex justify-center mb-4`}>
                        {statusInfo.icon}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{statusInfo.label}</h2>
                    <p className="text-gray-500">{statusInfo.description}</p>
                </div>

                {/* Observações */}
                {order.observations && (
                    <div className="card w-full p-4 border border-yellow-200 bg-yellow-50">
                        <h3 className="font-semibold text-yellow-800 mb-1 flex items-center gap-2">
                            <span>📝</span> Observações
                        </h3>
                        <p className="text-yellow-700 text-sm">{order.observations}</p>
                    </div>
                )}

                {/* Resumo do pedido */}
                <div className="card w-full p-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Resumo do Pedido</h3>
                    <div className="space-y-2">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    {item.quantity}x {item.item_name || 'Item'}
                                </span>
                                <span className="font-medium">
                                    R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
                        <span>Total</span>
                        <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                {/* Timeline de status */}
                <div className="card w-full p-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Progresso</h3>
                    {Object.entries(STATUS_INFO).map(([key, info]) => {
                        const statuses = Object.keys(STATUS_INFO)
                        const currentIndex = statuses.indexOf(order.status)
                        const itemIndex = statuses.indexOf(key)
                        const isDone = itemIndex <= currentIndex
                        return (
                            <div key={key} className="flex items-center gap-3 py-1.5">
                                <div
                                    className={`w-3 h-3 rounded-full flex-shrink-0 ${isDone ? 'bg-primary-500' : 'bg-gray-200'
                                        }`}
                                />
                                <span
                                    className={`text-sm ${isDone ? 'text-gray-800 font-medium' : 'text-gray-400'
                                        }`}
                                >
                                    {info.label}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {isDelivered && (
                    <button onClick={onNewOrder} className="btn-primary w-full shadow-lg">
                        Fazer novo pedido
                    </button>
                )}

                {(order.status === 'aguardando_pagamento' || order.status === 'pagamento_declarado') && (
                    <div className="w-full space-y-3">
                        <p className="text-gray-500 text-xs text-center px-4">
                            {order.status === 'aguardando_pagamento'
                                ? 'Já fez o pagamento? Envie o comprovante pelo WhatsApp:'
                                : 'Deseja enviar o comprovante novamente ou falar com o bar?'}
                        </p>
                        <a
                            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                                `Olá! Segue o comprovante do meu pedido #${orderId.slice(0, 8).toUpperCase()} (Mesa ${order.table_number}).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#25D366] text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                        >
                            <MessageCircle size={20} />
                            Enviar Comprovante (WhatsApp)
                        </a>
                    </div>
                )}

                {!isDelivered && (
                    <p className="text-gray-400 text-xs text-center">
                        Esta página atualiza automaticamente a cada 5 segundos
                    </p>
                )}
            </div>
        </div>
    )
}
