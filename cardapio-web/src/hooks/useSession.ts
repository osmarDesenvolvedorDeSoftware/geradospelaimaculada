// Hook para gerenciar o UUID de sessão único do cliente no localStorage
import { useEffect, useState } from 'react'

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export function useSession() {
    const [sessionId, setSessionId] = useState<string>('')

    useEffect(() => {
        let id = localStorage.getItem('cardapio_session_id')
        if (!id) {
            id = generateUUID()
            localStorage.setItem('cardapio_session_id', id)
        }
        setSessionId(id)
    }, [])

    const clearSession = () => {
        localStorage.removeItem('cardapio_session_id')
        localStorage.removeItem('cardapio_active_order')
    }

    return { sessionId, clearSession }
}

// Utilitário para pegar o número da mesa da URL (?mesa=X) ou localStorage
export function getTableNumber(): number {
    const params = new URLSearchParams(window.location.search)
    // 1. Tenta pegar token ofuscado (?t=base64)
    const token = params.get('t')
    if (token) {
        try {
            // Decodifica base64: "mesa:1" -> "bWVzYTox"
            const decoded = atob(token)
            const match = decoded.match(/mesa:(\d+)/)
            if (match) {
                const mesaVal = match[1]
                localStorage.setItem('cardapio_mesa_id', mesaVal)

                // Limpa URL
                const newUrl = window.location.pathname + window.location.hash
                window.history.replaceState({}, '', newUrl)

                return parseInt(mesaVal, 10)
            }
        } catch (e) {
            console.error('Token de mesa inválido')
        }
    }

    // 2. Fallback: parâmetro explícito (enquanto migra ou para testes)
    const mesaParam = params.get('mesa')
    if (mesaParam) {
        localStorage.setItem('cardapio_mesa_id', mesaParam)

        // Remove o parâmetro da URL para o usuário não ficar trocando
        const newUrl = window.location.pathname + window.location.hash
        window.history.replaceState({}, '', newUrl)

        return parseInt(mesaParam, 10)
    }

    const savedMesa = localStorage.getItem('cardapio_mesa_id')
    return savedMesa ? parseInt(savedMesa, 10) : 0
}
