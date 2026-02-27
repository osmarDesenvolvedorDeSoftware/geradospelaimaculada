import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Minus, Search, X, ShoppingBag, ChevronRight, User } from 'lucide-react'
import { menuApi } from '@/services/api'
import type { Category, Item } from '@/services/api'
import { useCartStore, useMemberStore } from '@/store/cartStore'
import { getTableNumber } from '@/hooks/useSession'

interface Props {
    onOpenCart: () => void
    onMemberLogin: () => void
    onMemberAccount: () => void
}

// ─── Componente de Modal de Produto ───────────────────────────────────────────
function ProductModal({
    item,
    initialQty,
    memberPrice,
    onClose,
    onAdd,
}: {
    item: Item
    initialQty: number
    memberPrice: number | null
    onClose: () => void
    onAdd: (qty: number, price: number) => void
}) {
    const [qty, setQty] = useState(initialQty > 0 ? initialQty : 1)
    const effectivePrice = memberPrice ?? item.price

    // Fecha ao clicar fora ou ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header imagem */}
                <div className="relative h-64 bg-gray-100 flex-shrink-0">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur text-gray-800 p-2 rounded-full shadow-sm hover:bg-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Conteúdo scrollável */}
                <div className="p-6 overflow-y-auto flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h2>
                    <p className="text-gray-600 leading-relaxed mb-4">
                        {item.description || "Delicioso e feito na hora para você."}
                    </p>
                    {/* Preço de membro */}
                    {memberPrice !== null && memberPrice !== item.price && (
                        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-2">
                            <p className="text-xs text-green-700 font-medium mb-0.5">Preço de membro</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-green-700 font-bold text-lg">
                                    R$ {memberPrice.toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-gray-400 line-through text-sm">
                                    R$ {item.price.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer fixo */}
                <div className="p-4 border-t border-gray-100 bg-white space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1.5">
                            <button
                                onClick={() => setQty(Math.max(1, qty - 1))}
                                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 active:scale-95 transition-transform"
                                disabled={qty <= 1}
                            >
                                <Minus size={18} />
                            </button>
                            <span className="text-xl font-bold text-gray-900 w-6 text-center">{qty}</span>
                            <button
                                onClick={() => setQty(qty + 1)}
                                className="w-10 h-10 flex items-center justify-center bg-primary-500 text-black rounded-lg shadow-sm active:scale-95 transition-transform"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="text-xl font-bold text-gray-900">
                                R$ {(effectivePrice * qty).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => { onAdd(qty, effectivePrice); onClose() }}
                        className="w-full btn-primary py-3.5 text-base shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all flex items-center justify-between px-6"
                    >
                        <span>Adicionar</span>
                        <span className="bg-black/10 px-2 py-0.5 rounded text-sm font-bold">
                            R$ {(effectivePrice * qty).toFixed(2).replace('.', ',')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function MenuPage({ onOpenCart, onMemberLogin, onMemberAccount }: Props) {
    const tableNumber = getTableNumber()
    const { items: cartItems, addItem, updateQuantity, totalItems, total } = useCartStore()
    const { member, isLoggedIn, logout } = useMemberStore()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)
    const [activeCategory, setActiveCategory] = useState<string>('')
    const categoryRefs = useRef<Record<string, HTMLElement | null>>({})

    // Resolve o preço a exibir para um item (membro ou normal)
    const getEffectivePrice = (item: Item): number => {
        if (isLoggedIn() && item.member_price !== undefined && item.member_price !== null) {
            return item.member_price
        }
        return item.price
    }

    const { data: categories = [], isLoading, isError } = useQuery({
        queryKey: ['menu'],
        queryFn: menuApi.getMenu,
    })

    // Filtra categorias e itens
    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories
        const term = searchTerm.toLowerCase()
        return categories
            .map((cat) => ({
                ...cat,
                items: cat.items.filter((i) => i.name.toLowerCase().includes(term) || i.description?.toLowerCase().includes(term)),
            }))
            .filter((cat) => cat.items.length > 0)
    }, [categories, searchTerm])

    // Scroll Spy simplificado
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 200
            for (const cat of filteredCategories) {
                const el = categoryRefs.current[cat.id]
                if (el && el.offsetTop <= scrollPos && el.offsetTop + el.offsetHeight > scrollPos) {
                    setActiveCategory(cat.id)
                    break
                }
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [filteredCategories])

    const scrollToCategory = (id: string) => {
        const el = categoryRefs.current[id]
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 180 // Offset do header
            window.scrollTo({ top: y, behavior: 'smooth' })
            setActiveCategory(id)
        }
    }

    const getQuantity = (itemId: string) => cartItems.find((i) => i.id === itemId)?.quantity ?? 0

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Carregando cardápio...</p>
            </div>
        </div>
    )

    if (isError) return (
        <div className="flex items-center justify-center min-h-screen p-6">
            <div className="text-center">
                <p className="text-gray-700 font-semibold">Erro ao carregar o cardápio</p>
                <p className="text-gray-500 text-sm mt-1">Verifique sua conexão e tente novamente</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 pb-28">
            {/* Header Fixo */}
            <div className="fixed top-0 left-0 right-0 bg-white z-40 shadow-sm">
                {/* Topo Vermelho: Marca + Mesa */}
                <div className="bg-primary-500 text-white px-4 pt-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-xl font-bold">Gerados pela imaculada</h1>
                            {tableNumber > 0 && <p className="text-primary-100 text-xs font-medium">Mesa {tableNumber}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Botão de membro */}
                            {isLoggedIn() ? (
                                <button
                                    onClick={onMemberAccount}
                                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                                >
                                    <User size={14} />
                                    {member?.name.split(' ')[0]}
                                </button>
                            ) : (
                                <button
                                    onClick={onMemberLogin}
                                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                                >
                                    <User size={14} />
                                    Sou membro
                                </button>
                            )}
                            {totalItems() > 0 && (
                                <button onClick={onOpenCart} className="bg-white/20 p-2 rounded-full relative">
                                    <ShoppingBag size={20} />
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-primary-500">{totalItems()}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Barra de Busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="O que você procura hoje?"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-inner"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Navegação por Categorias (Scroll Horizontal) */}
                <div className="flex overflow-x-auto py-3 px-4 gap-2 scrollbar-hide border-b border-gray-100 bg-white">
                    {filteredCategories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => scrollToCategory(cat.id)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat.id
                                ? 'bg-primary-500 text-black shadow-md shadow-primary-500/20'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Espaçador para o header fixo */}
            <div className="h-[180px]" />

            {/* Lista de Categorias e Itens */}
            <div className="px-4 space-y-8 mt-4">
                {filteredCategories.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p>Nenhum item encontrado para "{searchTerm}"</p>
                    </div>
                )}

                {filteredCategories.map((cat) => (
                    <section
                        key={cat.id}
                        id={cat.id}
                        ref={(el) => { categoryRefs.current[cat.id] = el }}
                        className="scroll-mt-[190px]"
                    >
                        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            {cat.name}
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.items.length}</span>
                        </h2>

                        <div className="space-y-4">
                            {cat.items.map((item) => {
                                const qty = getQuantity(item.id)
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className="card flex gap-3 p-3 active:scale-[0.99] transition-transform cursor-pointer"
                                    >
                                        {/* Foto */}
                                        <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                </div>
                                            )}
                                            {qty > 0 && (
                                                <div className="absolute bottom-1 right-1 bg-primary-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm">
                                                    {qty}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                            <div>
                                                <p className="font-semibold text-gray-900 truncate text-base">{item.name}</p>
                                                {item.description && (
                                                    <p className="text-gray-500 text-sm mt-1 line-clamp-2 leading-tight">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div>
                                                    {/* Preço: mostra promoção de membro se logado */}
                                                    {isLoggedIn() && item.member_price !== undefined && item.member_price !== null ? (
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-green-600 font-bold">
                                                                R$ {item.member_price.toFixed(2).replace('.', ',')}
                                                            </span>
                                                            <span className="text-gray-400 line-through text-xs">
                                                                R$ {item.price.toFixed(2).replace('.', ',')}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-900 font-bold">
                                                            R$ {item.price.toFixed(2).replace('.', ',')}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedItem(item)
                                                    }}
                                                    className="bg-gray-100 text-primary-600 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-primary-50 transition-colors"
                                                >
                                                    {qty > 0 ? 'Editar' : 'Adicionar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </div>

            {/* Botão flutuante do carrinho (Footer) */}
            {totalItems() > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-40 animate-slide-up">
                    <button
                        onClick={onOpenCart}
                        className="w-full btn-primary flex items-center justify-between py-3.5 px-5 shadow-xl shadow-primary-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 text-white text-sm font-bold px-2.5 py-1 rounded-full">
                                {totalItems()}
                            </span>
                            <span className="text-sm font-medium">Ver carrinho</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <span>R$ {total().toFixed(2).replace('.', ',')}</span>
                            <ChevronRight size={20} className="text-white/70" />
                        </div>
                    </button>
                </div>
            )}

            {/* Modal de Detalhes */}
            {selectedItem && (
                <ProductModal
                    item={selectedItem}
                    initialQty={getQuantity(selectedItem.id)}
                    memberPrice={isLoggedIn() && selectedItem.member_price !== undefined ? (selectedItem.member_price ?? null) : null}
                    onClose={() => setSelectedItem(null)}
                    onAdd={(qty, price) => {
                        if (getQuantity(selectedItem.id) > 0) {
                            updateQuantity(selectedItem.id, qty)
                        } else {
                            addItem({
                                id: selectedItem.id,
                                name: selectedItem.name,
                                price,
                                image_url: selectedItem.image_url,
                            })
                            if (qty > 1) updateQuantity(selectedItem.id, qty)
                        }
                    }}
                />
            )}
        </div>
    )
}
