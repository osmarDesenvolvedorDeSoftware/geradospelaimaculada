import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, CheckCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { orderApi } from '@/services/api'

interface Props {
    orderId: string
    onDeclared: () => void
}

export default function PaymentPage({ orderId, onDeclared }: Props) {
    const [copied, setCopied] = useState(false)
    const [declared, setDeclared] = useState(false)

    const { data: order } = useQuery({
        queryKey: ['order', orderId],
        queryFn: () => orderApi.getOrder(orderId),
    })

    const declareMutation = useMutation({
        mutationFn: () => orderApi.declarePayment(orderId),
        onSuccess: () => {
            setDeclared(true)
            setTimeout(() => onDeclared(), 1500)
        },
    })

    const handleCopy = () => {
        if (order?.pix_payload) {
            navigator.clipboard.writeText(order.pix_payload)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (!order) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-primary-500 text-white px-4 pt-10 pb-6 text-center">
                <h1 className="text-2xl font-bold">Pague via Pix</h1>
                <p className="text-primary-100 mt-1">Pedido #{orderId.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="flex-1 flex flex-col items-center px-4 py-6 gap-5">
                {/* Valor */}
                <div className="card w-full p-5 text-center">
                    <p className="text-gray-500 text-sm mb-1">Valor a pagar</p>
                    <p className="text-4xl font-bold text-gray-900">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Mesa {order.table_number} · {order.customer_name}</p>
                </div>

                {/* QR Code */}
                {order.pix_payload && (
                    <div className="card p-5 flex flex-col items-center gap-4 w-full">
                        <QRCodeSVG
                            value={order.pix_payload}
                            size={220}
                            level="M"
                            className="rounded-xl"
                        />
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 btn-secondary w-full justify-center"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle size={18} className="text-green-500" />
                                    <span className="text-green-600">Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    Copiar código Pix
                                </>
                            )}
                        </button>
                        <p className="text-gray-400 text-xs text-center">
                            Escaneie ou copie o código e pague em qualquer banco
                        </p>
                    </div>
                )}

                {/* Botão "Já paguei" */}
                <div className="card w-full p-4 bg-green-50 border-green-100">
                    <p className="text-sm text-gray-600 text-center mb-3">
                        Já fez o pagamento?
                    </p>
                    {declared ? (
                        <div className="flex items-center justify-center gap-2 text-green-600 font-semibold py-2">
                            <CheckCircle size={20} />
                            Restaurante avisado!
                        </div>
                    ) : (
                        <button
                            onClick={() => declareMutation.mutate()}
                            disabled={declareMutation.isPending}
                            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-4 py-3 rounded-xl transition-all"
                        >
                            {declareMutation.isPending
                                ? 'Avisando...'
                                : '✅ Já paguei! Avisar o restaurante'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
