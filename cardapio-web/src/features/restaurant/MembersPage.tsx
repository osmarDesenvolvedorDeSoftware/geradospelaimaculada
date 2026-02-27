import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Check, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, QrCode, CreditCard, Eye } from 'lucide-react'
import { adminMembersApi } from '@/services/api'
import type { Member, MemberTab, Order } from '@/services/api'
import { QRCodeSVG } from 'qrcode.react'

const MONTH_NAMES = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

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
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

// ─── Modal de Contas do Membro ────────────────────────────────────────────────
function MemberTabsModal({ member, onClose }: { member: Member; onClose: () => void }) {
    const qc = useQueryClient()
    const [expandedTab, setExpandedTab] = useState<string | null>(null)
    const [pixTab, setPixTab] = useState<{ pix_payload: string; qr_code_base64: string; saldo_devedor: number } | null>(null)

    const { data: tabs = [], isLoading } = useQuery({
        queryKey: ['member-tabs', member.id],
        queryFn: () => adminMembersApi.getMemberTabs(member.id),
    })

    const { data: tabOrders = [] } = useQuery({
        queryKey: ['tab-orders', member.id, expandedTab],
        queryFn: () => expandedTab ? adminMembersApi.getTabOrders(member.id, expandedTab) : Promise.resolve([]),
        enabled: !!expandedTab,
    })

    const payMutation = useMutation({
        mutationFn: ({ tabId, amount }: { tabId: string; amount: number }) =>
            adminMembersApi.registerPayment(member.id, tabId, { amount }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['member-tabs', member.id] }),
    })

    const pixMutation = useMutation({
        mutationFn: (tabId: string) => adminMembersApi.generatePixForTab(member.id, tabId),
        onSuccess: (data) => setPixTab(data),
    })

    return (
        <Modal title={`Conta de ${member.name}`} onClose={onClose}>
            {isLoading ? (
                <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tabs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhuma conta registrada ainda.</p>
            ) : (
                <div className="space-y-3">
                    {tabs.map((tab: MemberTab) => {
                        const saldo = tab.total_consumed - tab.total_paid
                        const isOpen = expandedTab === tab.id
                        return (
                            <div key={tab.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Header da conta */}
                                <button
                                    onClick={() => setExpandedTab(isOpen ? null : tab.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {MONTH_NAMES[tab.month]} / {tab.year}
                                        </span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            tab.status === 'paga' ? 'bg-green-100 text-green-700'
                                            : tab.status === 'parcial' ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {tab.status === 'paga' ? 'Quitada' : tab.status === 'parcial' ? 'Parcial' : 'Em aberto'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-bold ${saldo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {saldo > 0 ? `Deve R$ ${saldo.toFixed(2).replace('.', ',')}` : 'Quitado'}
                                        </span>
                                        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </button>

                                {/* Detalhes expandidos */}
                                {isOpen && (
                                    <div className="p-4 space-y-4">
                                        {/* Resumo */}
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="bg-gray-50 rounded-lg p-2">
                                                <p className="text-gray-500">Consumido</p>
                                                <p className="font-bold text-gray-900">R$ {tab.total_consumed.toFixed(2).replace('.', ',')}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-2">
                                                <p className="text-gray-500">Pago</p>
                                                <p className="font-bold text-green-600">R$ {tab.total_paid.toFixed(2).replace('.', ',')}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-2">
                                                <p className="text-gray-500">Saldo</p>
                                                <p className={`font-bold ${saldo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                    R$ {saldo.toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Pedidos */}
                                        {tabOrders.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos</p>
                                                {(tabOrders as Order[]).map((order) => (
                                                    <div key={order.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-gray-500">
                                                                {new Date(order.created_at).toLocaleDateString('pt-BR')} · Mesa {order.table_number}
                                                            </span>
                                                            <span className="font-bold">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                                                        </div>
                                                        <div className="text-gray-600">
                                                            {order.items.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Ações de pagamento */}
                                        {saldo > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registrar Pagamento</p>

                                                {/* QR Code Pix */}
                                                {pixTab ? (
                                                    <div className="text-center space-y-3">
                                                        <p className="text-sm text-gray-600">
                                                            Saldo: <strong>R$ {pixTab.saldo_devedor.toFixed(2).replace('.', ',')}</strong>
                                                        </p>
                                                        <div className="flex justify-center">
                                                            <QRCodeSVG value={pixTab.pix_payload} size={180} level="M" className="rounded-xl" />
                                                        </div>
                                                        <button
                                                            onClick={() => setPixTab(null)}
                                                            className="text-xs text-gray-400 underline"
                                                        >
                                                            Fechar QR Code
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => pixMutation.mutate(tab.id)}
                                                            disabled={pixMutation.isPending}
                                                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary-500 text-white text-xs font-semibold py-2.5 rounded-xl"
                                                        >
                                                            <QrCode size={14} />
                                                            Gerar Pix
                                                        </button>
                                                        <button
                                                            onClick={() => payMutation.mutate({ tabId: tab.id, amount: saldo })}
                                                            disabled={payMutation.isPending}
                                                            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl"
                                                        >
                                                            <CreditCard size={14} />
                                                            Confirmar Cartão
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </Modal>
    )
}

// ─── Formulário Novo Membro ───────────────────────────────────────────────────
function NewMemberForm({ onSave, onClose }: { onSave: (data: { name: string; email: string; password: string; phone?: string }) => void; onClose: () => void }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')
    const isValid = name.trim() && email.trim() && password.trim()

    return (
        <Modal title="Cadastrar Membro" onClose={onClose}>
            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
                    <input
                        autoFocus
                        placeholder="Ex: João da Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail *</label>
                    <input
                        type="email"
                        placeholder="joao@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Senha inicial *</label>
                    <input
                        type="text"
                        placeholder="Senha que será entregue ao membro"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone <span className="font-normal">(opcional)</span></label>
                    <input
                        placeholder="(99) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <button
                    onClick={() => isValid && onSave({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined })}
                    disabled={!isValid}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    <Check size={16} /> Cadastrar Membro
                </button>
            </div>
        </Modal>
    )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function MembersPage() {
    const qc = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [viewingTabs, setViewingTabs] = useState<Member | null>(null)

    const { data: members = [], isLoading } = useQuery({
        queryKey: ['admin-members'],
        queryFn: adminMembersApi.listMembers,
    })

    const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-members'] })

    const createMember = useMutation({
        mutationFn: adminMembersApi.createMember,
        onSuccess: () => { invalidate(); setShowForm(false) },
    })

    const toggleMember = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
            adminMembersApi.updateMember(id, { is_active }),
        onSuccess: invalidate,
    })

    const deleteMember = useMutation({
        mutationFn: adminMembersApi.deleteMember,
        onSuccess: invalidate,
    })

    return (
        <>
            {showForm && (
                <NewMemberForm
                    onSave={(data) => createMember.mutate(data)}
                    onClose={() => setShowForm(false)}
                />
            )}
            {viewingTabs && (
                <MemberTabsModal
                    member={viewingTabs}
                    onClose={() => setViewingTabs(null)}
                />
            )}

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Membros</h2>
                        <p className="text-xs text-gray-500">{members.length} cadastrado{members.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
                    >
                        <Plus size={16} /> Novo Membro
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="card p-8 text-center text-gray-400">
                        <p className="font-medium">Nenhum membro cadastrado</p>
                        <p className="text-sm mt-1">Clique em "Novo Membro" para começar</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {members.map((member: Member) => (
                            <div key={member.id} className={`card p-4 flex items-center gap-3 ${!member.is_active ? 'opacity-50' : ''}`}>
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                                    {member.name.slice(0, 2).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                                    {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setViewingTabs(member)}
                                        title="Ver contas"
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => toggleMember.mutate({ id: member.id, is_active: !member.is_active })}
                                        title={member.is_active ? 'Desativar' : 'Ativar'}
                                        className={`p-2 rounded-lg transition-colors ${member.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                        {member.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Remover ${member.name}?`)) deleteMember.mutate(member.id)
                                        }}
                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
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
