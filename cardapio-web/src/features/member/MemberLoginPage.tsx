import { useState } from 'react'
import { ArrowLeft, LogIn, AlertCircle } from 'lucide-react'
import { memberApi } from '@/services/api'
import { useMemberStore } from '@/store/cartStore'

interface Props {
    onBack: () => void
    onSuccess: () => void
}

export default function MemberLoginPage({ onBack, onSuccess }: Props) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useMemberStore()

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) return
        setError('')
        setLoading(true)
        try {
            const data = await memberApi.login(email.trim(), password)
            login(data.member, data.access_token)
            onSuccess()
        } catch {
            setError('E-mail ou senha incorretos')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-bold text-lg">Área do Membro</h1>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-5">
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold text-gray-900">Entrar como Membro</h2>
                        <p className="text-gray-500 text-sm">
                            Acesse com suas credenciais para ver preços especiais e poder lançar na conta
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <input
                            type="email"
                            placeholder="Seu e-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={loading || !email.trim() || !password.trim()}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                        <LogIn size={18} />
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                        Não tem acesso? Fale com o responsável para ser cadastrado.
                    </p>
                </div>
            </div>
        </div>
    )
}
