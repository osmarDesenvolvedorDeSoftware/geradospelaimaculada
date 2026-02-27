import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Numeric, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Member(Base):
    """Membro da igreja — acessa preço de membro e pode lançar na conta."""
    __tablename__ = "members"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    tabs: Mapped[list["MemberTab"]] = relationship("MemberTab", back_populates="member")
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="member")


class MemberTab(Base):
    """Conta mensal do membro — acumula pedidos lançados na conta."""
    __tablename__ = "member_tabs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("members.id"), nullable=False, index=True
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)   # 1–12
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_consumed: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    # status: aberta | paga | parcial
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="aberta")
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # observação do admin

    member: Mapped["Member"] = relationship("Member", back_populates="tabs")
