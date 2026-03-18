from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime

ORDER_STATUSES = [
    "aguardando_pagamento",
    "pagamento_declarado",
    "em_preparacao",
    "pronto",
    "entregue",
    "cancelado",
    "conta",  # pedido lançado na conta — não precisa de pagamento pix
]


class OrderItemCreate(BaseModel):
    item_id: str
    quantity: int

class OrderItemResponse(BaseModel):
    id: str
    item_id: str
    quantity: int
    unit_price: float
    item_name: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def set_item_name(cls, data):
        # Se for um objeto ORM (não dict) e tiver o relacionamento 'item' carregado
        if not isinstance(data, dict):
            if hasattr(data, 'item') and data.item:
                # Injetamos o nome do item no atributo que o Pydantic vai ler? 
                # Não, 'data' é o objeto ORM. Não podemos modificar o objeto ORM facilmente se não for mapeado.
                # Mas podemos retornar um dict com os dados.
                return {
                    "id": data.id,
                    "item_id": data.item_id,
                    "quantity": data.quantity,
                    "unit_price": data.unit_price,
                    "item_name": data.item.name
                }
        return data

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    session_id: str
    table_number: int
    customer_name: str
    observations: Optional[str] = None
    member_id: Optional[str] = None       # None = pedido anônimo
    payment_method: str = "pix"           # pix | conta
    items: list[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: str


def _extract_member_name(data) -> Optional[dict]:
    """Helper: returns a dict with member_name injected if member relationship is loaded."""
    if isinstance(data, dict) or not hasattr(data, '__table__'):
        return None
    member = data.__dict__.get('member')
    if member is None:
        return None
    return {
        **{c.key: getattr(data, c.key) for c in data.__table__.columns},
        "member_name": member.name,
    }


class OrderResponse(BaseModel):
    id: str
    session_id: str
    table_number: int
    customer_name: str
    member_name: Optional[str] = None
    observations: Optional[str]
    status: str
    total: float
    payment_method: str
    member_id: Optional[str] = None
    pix_payload: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    @model_validator(mode='before')
    @classmethod
    def set_member_name(cls, data):
        base = _extract_member_name(data)
        if base is not None:
            base["items"] = data.__dict__.get('items', [])
            return base
        return data

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    """Versão compacta usada na listagem do painel do restaurante."""
    id: str
    table_number: int
    customer_name: str
    member_name: Optional[str] = None
    status: str
    total: float
    payment_method: str
    member_id: Optional[str] = None
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def set_member_name(cls, data):
        return _extract_member_name(data) or data

    class Config:
        from_attributes = True
