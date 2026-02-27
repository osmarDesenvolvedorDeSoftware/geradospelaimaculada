import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Plus, Pencil, Trash2, Tag, UtensilsCrossed,
    X, Check, ImagePlus, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { adminApi } from '@/services/api'
import type { Category, Item } from '@/services/api'

// ─── Upload de Imagem ─────────────────────────────────────────────────────────
function ImageUploader({
    value,
    onChange,
}: {
    value: string
    onChange: (url: string) => void
}) {
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const uploadFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return
        setUploading(true)
        const form = new FormData()
        form.append('file', file)
        try {
            const res = await fetch('/api/uploads/image', {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('restaurant_token')}` },
                body: form,
            })
            const data = await res.json()
            onChange(data.url)
        } finally {
            setUploading(false)
        }
    }, [onChange])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) uploadFile(file)
    }, [uploadFile])

    return (
        <div className="space-y-2">
            {value ? (
                <div className="relative group">
                    <img
                        src={value}
                        alt="Prévia"
                        className="w-full h-36 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                            Trocar
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => inputRef.current?.click()}
                    className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
                >
                    {uploading ? (
                        <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <ImagePlus size={24} className="text-gray-300 mb-1" />
                            <p className="text-xs text-gray-400">Clique ou arraste a foto</p>
                        </>
                    )}
                </div>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f) }}
            />
        </div>
    )
}

// ─── Modal Genérico ───────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

// ─── Formulário de Categoria ──────────────────────────────────────────────────
function CategoryForm({
    initial,
    onSave,
    onClose,
}: {
    initial?: Category
    onSave: (data: { name: string; description?: string }) => void
    onClose: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [description, setDescription] = useState(initial?.description ?? '')

    return (
        <Modal title={initial ? 'Editar Categoria' : 'Nova Categoria'} onClose={onClose}>
            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                    <input
                        autoFocus
                        placeholder="Ex: Lanches, Bebidas, Sobremesas..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição <span className="font-normal">(opcional)</span></label>
                    <input
                        placeholder="Ex: Feitos na hora com ingredientes frescos"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <button
                    onClick={() => name.trim() && onSave({ name: name.trim(), description: description.trim() || undefined })}
                    disabled={!name.trim()}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    <Check size={16} /> Salvar Categoria
                </button>
            </div>
        </Modal>
    )
}

// ─── Formulário de Item ───────────────────────────────────────────────────────
function ItemForm({
    initial,
    categories,
    defaultCategoryId,
    onSave,
    onClose,
}: {
    initial?: Item
    categories: Category[]
    defaultCategoryId?: string
    onSave: (data: {
        name: string; category_id: string; price: number
        member_price?: number
        description?: string; image_url?: string
    }) => void
    onClose: () => void
}) {
    const [name, setName] = useState(initial?.name ?? '')
    const [price, setPrice] = useState(initial?.price?.toString() ?? '')
    const [memberPrice, setMemberPrice] = useState(initial?.member_price?.toString() ?? '')
    const [description, setDescription] = useState(initial?.description ?? '')
    const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
    const [categoryId, setCategoryId] = useState(initial?.category_id ?? defaultCategoryId ?? '')

    const isValid = name.trim() && price && parseFloat(price) > 0 && categoryId

    return (
        <Modal title={initial ? 'Editar Item' : 'Novo Item'} onClose={onClose}>
            <div className="space-y-3">
                {/* Foto */}
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Foto do Produto</label>
                    <ImageUploader value={imageUrl} onChange={setImageUrl} />
                </div>

                {/* Nome */}
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                    <input
                        autoFocus
                        placeholder="Ex: X-Burguer Artesanal, Coca-Cola..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>

                {/* Preço + Preço de Membro + Categoria */}
                <div className="flex gap-2">
                    <div className="w-28">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Preço (R$) *</label>
                        <input
                            type="number" min="0" step="0.01"
                            placeholder="0,00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div className="w-28">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Membro (R$)</label>
                        <input
                            type="number" min="0" step="0.01"
                            placeholder="Opcional"
                            value={memberPrice}
                            onChange={(e) => setMemberPrice(e.target.value)}
                            className="w-full border border-green-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria *</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                        >
                            <option value="">Selecionar...</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Descrição */}
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição <span className="font-normal">(opcional)</span></label>
                    <textarea
                        rows={2}
                        placeholder="Ex: Pão artesanal, carne 180g, queijo, alface, tomate..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                    />
                </div>

                <button
                    onClick={() =>
                        isValid && onSave({
                            name: name.trim(), category_id: categoryId,
                            price: parseFloat(price),
                            member_price: memberPrice && parseFloat(memberPrice) > 0 ? parseFloat(memberPrice) : undefined,
                            description: description.trim() || undefined,
                            image_url: imageUrl || undefined,
                        })
                    }
                    disabled={!isValid}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    <Check size={16} /> Salvar Item
                </button>
            </div>
        </Modal>
    )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function ProductsPage() {
    const qc = useQueryClient()
    const [tab, setTab] = useState<'categories' | 'items'>('categories')
    const [expandedCat, setExpandedCat] = useState<string | null>(null)

    // Modais
    const [showCatForm, setShowCatForm] = useState(false)
    const [editingCat, setEditingCat] = useState<Category | null>(null)
    const [showItemForm, setShowItemForm] = useState<{ defaultCatId?: string } | null>(null)
    const [editingItem, setEditingItem] = useState<Item | null>(null)

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['admin-categories'],
        queryFn: adminApi.getCategories,
    })

    const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-categories'] })

    const createCat = useMutation({ mutationFn: adminApi.createCategory, onSuccess: () => { invalidate(); setShowCatForm(false) } })
    const updateCat = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateCategory>[1] }) => adminApi.updateCategory(id, data),
        onSuccess: () => { invalidate(); setEditingCat(null) },
    })
    const deleteCat = useMutation({ mutationFn: adminApi.deleteCategory, onSuccess: invalidate })

    const createItem = useMutation({ mutationFn: adminApi.createItem, onSuccess: () => { invalidate(); setShowItemForm(null) } })
    const updateItem = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateItem>[1] }) => adminApi.updateItem(id, data),
        onSuccess: () => { invalidate(); setEditingItem(null) },
    })
    const deleteItem = useMutation({ mutationFn: adminApi.deleteItem, onSuccess: invalidate })
    const toggleItem = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) => adminApi.updateItem(id, { active }),
        onSuccess: invalidate,
    })

    const allItems = categories.flatMap((c) => (c.items ?? []).map((i) => ({ ...i, categoryName: c.name })))

    if (isLoading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <>
            {/* Modais */}
            {showCatForm && (
                <CategoryForm
                    onSave={(d) => createCat.mutate(d)}
                    onClose={() => setShowCatForm(false)}
                />
            )}
            {editingCat && (
                <CategoryForm
                    initial={editingCat}
                    onSave={(d) => updateCat.mutate({ id: editingCat.id, data: d })}
                    onClose={() => setEditingCat(null)}
                />
            )}
            {showItemForm !== null && (
                <ItemForm
                    categories={categories}
                    defaultCategoryId={showItemForm.defaultCatId}
                    onSave={(d) => createItem.mutate(d)}
                    onClose={() => setShowItemForm(null)}
                />
            )}
            {editingItem && (
                <ItemForm
                    initial={editingItem}
                    categories={categories}
                    onSave={(d) => updateItem.mutate({ id: editingItem.id, data: d })}
                    onClose={() => setEditingItem(null)}
                />
            )}

            <div className="space-y-4">
                {/* Tabs + Botão */}
                <div className="flex items-center justify-between">
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setTab('categories')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'categories' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            <Tag size={14} /> Categorias
                        </button>
                        <button
                            onClick={() => setTab('items')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'items' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            <UtensilsCrossed size={14} /> Todos os Itens
                        </button>
                    </div>

                    <button
                        onClick={() => tab === 'categories' ? setShowCatForm(true) : setShowItemForm({})}
                        className="flex items-center gap-1.5 bg-primary-500 text-white px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                    >
                        <Plus size={16} />
                        {tab === 'categories' ? 'Categoria' : 'Item'}
                    </button>
                </div>

                {/* ── ABA CATEGORIAS ── */}
                {tab === 'categories' && (
                    <div className="space-y-2">
                        {categories.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <p className="text-5xl mb-3">🗂️</p>
                                <p className="font-medium mb-1">Nenhuma categoria</p>
                                <p className="text-sm">Crie uma categoria para começar a adicionar itens ao cardápio</p>
                                <button onClick={() => setShowCatForm(true)} className="mt-4 text-primary-500 text-sm font-semibold underline">
                                    Criar primeira categoria
                                </button>
                            </div>
                        )}

                        {categories.map((cat) => (
                            <div key={cat.id} className="card overflow-hidden">
                                {/* Cabeçalho */}
                                <div
                                    className="flex items-center gap-3 p-3.5 cursor-pointer"
                                    onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                                >
                                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Tag size={18} className="text-primary-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900">{cat.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {(cat.items?.length ?? 0) === 0 ? 'Nenhum item' :
                                                `${cat.items?.filter(i => i.active).length ?? 0} ativo(s) · ${cat.items?.length ?? 0} total`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => setEditingCat(cat)}
                                            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if ((cat.items?.length ?? 0) > 0) {
                                                    if (!confirm(`"${cat.name}" tem itens. Deseja excluir mesmo assim?`)) return
                                                }
                                                deleteCat.mutate(cat.id)
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    {expandedCat === cat.id
                                        ? <ChevronUp size={16} className="text-gray-300 flex-shrink-0" />
                                        : <ChevronDown size={16} className="text-gray-300 flex-shrink-0" />}
                                </div>

                                {/* Itens */}
                                {expandedCat === cat.id && (
                                    <div className="border-t border-gray-100">
                                        {(cat.items ?? []).length === 0 && (
                                            <p className="text-center text-sm text-gray-400 py-4">Nenhum item nesta categoria</p>
                                        )}
                                        {(cat.items ?? []).map((item) => (
                                            <div key={item.id}
                                                className={`flex items-center gap-3 px-3.5 py-3 border-b border-gray-50 last:border-0 ${!item.active ? 'opacity-60' : ''}`}
                                            >
                                                {/* Foto */}
                                                <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                                    {item.image_url
                                                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><UtensilsCrossed size={18} /></div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <p className="text-sm text-primary-600 font-bold">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                                                        {item.member_price !== undefined && item.member_price !== null && (
                                                            <p className="text-xs text-green-600 font-medium">
                                                                membro: R$ {item.member_price.toFixed(2).replace('.', ',')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {/* Toggle ativo */}
                                                    <button
                                                        onClick={() => toggleItem.mutate({ id: item.id, active: !item.active })}
                                                        className={`transition-colors ${item.active ? 'text-green-500' : 'text-gray-300'}`}
                                                        title={item.active ? 'Desativar' : 'Ativar'}
                                                    >
                                                        {item.active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirm(`Excluir "${item.name}"?`) && deleteItem.mutate(item.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => setShowItemForm({ defaultCatId: cat.id })}
                                            className="w-full flex items-center justify-center gap-1.5 text-sm text-primary-500 font-semibold py-3 hover:bg-primary-50 transition-colors"
                                        >
                                            <Plus size={15} /> Adicionar item em "{cat.name}"
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── ABA TODOS OS ITENS ── */}
                {tab === 'items' && (
                    <div className="space-y-2">
                        {allItems.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <p className="text-5xl mb-3">🍽️</p>
                                <p className="font-medium mb-1">Nenhum item no cardápio</p>
                                <button onClick={() => setShowItemForm({})} className="mt-4 text-primary-500 text-sm font-semibold underline">
                                    Adicionar primeiro item
                                </button>
                            </div>
                        )}
                        {allItems.map((item) => (
                            <div key={item.id}
                                className={`card flex items-center gap-3 p-3 ${!item.active ? 'opacity-60' : ''}`}
                            >
                                <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                    {item.image_url
                                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><UtensilsCrossed size={20} /></div>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-400">{(item as typeof item & { categoryName: string }).categoryName}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <p className="text-sm text-primary-600 font-bold">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                                        {item.member_price !== undefined && item.member_price !== null && (
                                            <p className="text-xs text-green-600 font-medium">
                                                membro: R$ {item.member_price.toFixed(2).replace('.', ',')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => toggleItem.mutate({ id: item.id, active: !item.active })}
                                        className={`transition-colors ${item.active ? 'text-green-500' : 'text-gray-300'}`}
                                    >
                                        {item.active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                                    </button>
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => confirm(`Excluir "${item.name}"?`) && deleteItem.mutate(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
