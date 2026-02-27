from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ─── Member ───────────────────────────────────────────────────────────────────

class MemberCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None  # se preenchido, atualiza a senha


class MemberResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MemberLogin(BaseModel):
    email: str
    password: str


# ─── MemberTab ────────────────────────────────────────────────────────────────

class MemberTabResponse(BaseModel):
    id: str
    member_id: str
    month: int
    year: int
    total_consumed: float
    total_paid: float
    status: str
    closed_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True


class MemberTabPayment(BaseModel):
    """Registra um pagamento (parcial ou total) na conta do membro."""
    amount: float
    notes: Optional[str] = None


class MemberTabWithOrders(MemberTabResponse):
    """Tab com lista de pedidos (usada no extrato)."""
    orders: list = []  # lista de OrderSummary — evita importação circular
