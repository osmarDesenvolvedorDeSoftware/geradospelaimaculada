import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, BellRing, Volume2, Play } from 'lucide-react'
import { restaurantApi } from '@/services/api'

export default function TvDashboard() {
    const [isStarted, setIsStarted] = useState(false)
    const [lastReadyId, setLastReadyId] = useState<string | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const queryClient = useQueryClient()

    const { data: orders } = useQuery({
        queryKey: ['tv-orders'],
        queryFn: restaurantApi.getActiveOrders,
        refetchInterval: 10000,
    })

    const readyOrders = orders?.filter((o) => o.status === 'pronto') ?? []

    // Som e Voz
    const announceOrder = (customerName: string) => {
        if (!isStarted) return

        // 1. Som de sino
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
        audio.play().catch(e => console.error("Erro ao tocar áudio:", e))

        // 2. Voz anunciando
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(`Pedido de ${customerName} pronto para retirada`)
            utterance.lang = 'pt-BR'
            utterance.rate = 0.9
            window.speechSynthesis.speak(utterance)
        }, 1000)
    }

    // WebSocket para tempo real
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
        const wsUrl = apiUrl.replace('http', 'ws').replace('/api', '') + '/api/ws/restaurant'
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            if (msg.event === 'status_atualizado' && msg.data.status === 'pronto') {
                queryClient.invalidateQueries({ queryKey: ['tv-orders'] })
                if (msg.data.order_id !== lastReadyId) {
                    setLastReadyId(msg.data.order_id)
                    announceOrder(msg.data.customer_name)
                }
            }
        }

        return () => ws.close()
    }, [queryClient, lastReadyId, isStarted])

    if (!isStarted) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center">
                <div className="mb-8 bg-slate-800 p-8 rounded-full border-4 border-primary-500 animate-pulse">
                    <Volume2 size={80} className="text-primary-400" />
                </div>
                <h1 className="text-4xl font-bold mb-4 uppercase tracking-wider">Painel de Retirada</h1>
                <p className="text-xl text-slate-400 mb-12 max-w-md">
                    Clique no botão abaixo para ativar os avisos sonoros da TV.
                </p>
                <button
                    onClick={() => setIsStarted(true)}
                    className="flex items-center gap-4 bg-primary-600 hover:bg-primary-500 text-white text-3xl font-bold px-12 py-6 rounded-3xl transition-all transform hover:scale-105 active:scale-95 shadow-2xl shadow-primary-900/50"
                >
                    <Play size={40} fill="currentColor" />
                    INICIAR PAINEL
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden font-sans">
            {/* Header / Relógio */}
            <div className="bg-slate-900 border-b border-slate-800 px-12 py-8 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="bg-primary-500 p-4 rounded-2xl">
                        <Package size={48} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                            Pedidos Prontos
                        </h1>
                        <p className="text-primary-400 font-bold text-xl uppercase tracking-widest">
                            Favor retirar no balcão
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-6xl font-mono font-bold text-white">
                        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 p-12 overflow-y-auto">
                {readyOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <BellRing size={200} className="text-slate-500 mb-8" />
                        <h2 className="text-5xl font-bold text-slate-500 uppercase">Aguardando pedidos...</h2>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {readyOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-slate-900 border-2 border-slate-800 rounded-[40px] p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-500"
                            >
                                <div className="text-slate-400 text-2xl font-bold uppercase mb-4 tracking-widest">
                                    Cliente
                                </div>
                                <div className="text-6xl font-black text-white mb-6 break-words w-full">
                                    {order.customer_name.split(' ')[0]}
                                </div>
                                <div className="bg-green-500/10 text-green-400 px-8 py-4 rounded-2xl text-3xl font-black uppercase border border-green-500/20">
                                    PRONTO
                                </div>
                                <div className="mt-8 text-slate-500 font-bold text-xl uppercase italic">
                                    Mesa {order.table_number}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Branding */}
            <div className="bg-primary-600 px-12 py-4">
                <p className="text-center text-white text-xl font-bold uppercase tracking-[0.3em]">
                    Gerados pela Imaculada · Sistema de Pedidos Online
                </p>
            </div>
        </div>
    )
}
