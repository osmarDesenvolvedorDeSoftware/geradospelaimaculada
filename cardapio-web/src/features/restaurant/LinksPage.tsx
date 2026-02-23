import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

export default function LinksPage() {
    const [baseUrl] = useState(window.location.origin)
    const [copied, setCopied] = useState<number | null>(null)

    const tables = Array.from({ length: 20 }, (_, i) => i + 1)

    const generateLink = (tableNum: number) => {
        // Gera token Base64 "mesa:N"
        const token = btoa(`mesa:${tableNum}`)
        return `${baseUrl}/?t=${token}`
    }

    const copyToClipboard = (text: string, tableNum: number) => {
        navigator.clipboard.writeText(text)
        setCopied(tableNum)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 no-print">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Gerador de QR Codes</h2>
                <p className="text-gray-500 mb-4">
                    Estes são os QR Codes definitivos para suas mesas. Eles já contêm o link seguro com o código secreto.
                </p>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                    <strong>Como usar:</strong> Os clientes só precisam apontar a câmera. O sistema reconhece a mesa e esconde o link automaticamente.
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-4">
                {tables.map((num) => {
                    const link = generateLink(num)
                    return (
                        <div key={num} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors flex flex-col items-center text-center space-y-4 shadow-sm page-break-inside-avoid">
                            <h3 className="font-bold text-lg text-gray-900">Mesa {num}</h3>

                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                <QRCodeCanvas
                                    value={link}
                                    size={160}
                                    level={'H'}
                                    includeMargin={true}
                                />
                            </div>

                            <div className="flex gap-2 w-full no-print">
                                <button
                                    onClick={() => copyToClipboard(link, num)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${copied === num
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                                        }`}
                                >
                                    {copied === num ? <Check size={16} /> : <Copy size={16} />}
                                    {copied === num ? 'Copiado!' : 'Copiar'}
                                </button>
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Testar Link"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            </div>
                        </div>
                    )
                })}
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .page-break-inside-avoid { page-break-inside: avoid; }
                    body { background: white; }
                    .card { box-shadow: none; border: 1px solid #eee; }
                }
            `}</style>
        </div>
    )
}
