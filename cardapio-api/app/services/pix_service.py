"""
Gerador de payload Pix Estático (BR Code / EMV QR Code).
Implementação direta sem dependências externas — segue a especificação
do Banco Central do Brasil (Resolução BCB nº 1/2020).
"""
import qrcode
import io
import base64
from app.core.config import settings


def _crc16_ccitt(data: str) -> str:
    """Calcula o CRC16-CCITT-FALSE do payload Pix."""
    crc = 0xFFFF
    for char in data:
        crc ^= ord(char) << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return format(crc, "04X")


def _tlv(field_id: str, value: str) -> str:
    """Formata um campo no padrão TLV (Tag + Length + Value) do EMV."""
    return f"{field_id}{len(value):02d}{value}"


def gerar_payload_pix(total: float, order_id: str) -> str:
    """
    Gera o payload BR Code do Pix Estático com valor dinâmico.
    100% local — sem API de banco, sem custo, sem dependência externa.
    """
    # Campo 26: Merchant Account Information (chave Pix)
    gui = "BR.GOV.BCB.PIX"
    chave = settings.PIX_KEY[:77]  # máximo permitido
    merchant_account = _tlv("26", _tlv("00", gui) + _tlv("01", chave))

    # Campo 54: valor da transação (ex: "42.50")
    amount_str = f"{total:.2f}"

    # Campo 62: Additional Data Field (txid — identificador do pedido)
    txid = order_id.replace("-", "")[:25]  # máx 25 chars, sem hífen
    additional_data = _tlv("62", _tlv("05", txid))

    # Monta o payload SEM o CRC (o próprio campo 63 entra na conta)
    nome = settings.RESTAURANT_NAME[:25]
    cidade = settings.RESTAURANT_CITY[:15]

    payload = (
        "000201"                          # Payload Format Indicator
        + "010212"                         # Point of Initiation (12 = estático)
        + merchant_account                 # Conta do recebedor (chave Pix)
        + "52040000"                       # Merchant Category Code
        + "5303986"                        # Moeda: BRL (986)
        + _tlv("54", amount_str)           # Valor da cobrança
        + "5802BR"                         # País: BR
        + _tlv("59", nome)                 # Nome do recebedor
        + _tlv("60", cidade)               # Cidade do recebedor
        + additional_data                  # ID da transação
        + "6304"                           # CRC placeholder (4 chars vêm abaixo)
    )

    # Adiciona o CRC16 calculado sobre o payload + "6304"
    return payload + _crc16_ccitt(payload)


def gerar_qr_code_base64(payload: str) -> str:
    """
    Converte o payload Pix em imagem QR Code base64
    para ser exibida diretamente no frontend via <img src="data:...">
    """
    img = qrcode.make(payload)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
