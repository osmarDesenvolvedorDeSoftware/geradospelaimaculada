from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.member import Member, MemberTab
from app.models.order import Order
from app.schemas.member import MemberCreate, MemberUpdate, MemberTabPayment
from app.core.security import get_password_hash


# ─── Member ───────────────────────────────────────────────────────────────────

async def get_all(db: AsyncSession) -> list[Member]:
    result = await db.execute(select(Member).order_by(Member.name))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, member_id: str) -> Optional[Member]:
    result = await db.execute(select(Member).where(Member.id == member_id))
    return result.scalar_one_or_none()


async def get_by_email(db: AsyncSession, email: str) -> Optional[Member]:
    result = await db.execute(select(Member).where(Member.email == email))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: MemberCreate) -> Member:
    member = Member(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        phone=data.phone,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def update_member(
    db: AsyncSession, member_id: str, data: MemberUpdate
) -> Optional[Member]:
    values = data.model_dump(exclude_unset=True)
    if "password" in values:
        values["hashed_password"] = get_password_hash(values.pop("password"))
    if values:
        await db.execute(update(Member).where(Member.id == member_id).values(**values))
        await db.commit()
    return await get_by_id(db, member_id)


async def delete(db: AsyncSession, member_id: str) -> bool:
    member = await get_by_id(db, member_id)
    if not member:
        return False
    await db.delete(member)
    await db.commit()
    return True


# ─── MemberTab ────────────────────────────────────────────────────────────────

async def get_or_create_current_tab(db: AsyncSession, member_id: str) -> MemberTab:
    """Retorna a aba do mês atual, criando se não existir."""
    now = datetime.utcnow()
    result = await db.execute(
        select(MemberTab).where(
            MemberTab.member_id == member_id,
            MemberTab.month == now.month,
            MemberTab.year == now.year,
        )
    )
    tab = result.scalar_one_or_none()
    if not tab:
        tab = MemberTab(
            member_id=member_id,
            month=now.month,
            year=now.year,
            total_consumed=0,
            total_paid=0,
            status="aberta",
        )
        db.add(tab)
        await db.commit()
        await db.refresh(tab)
    return tab


async def add_to_tab(db: AsyncSession, member_id: str, amount: float) -> MemberTab:
    """Adiciona um valor ao total consumido da conta do mês."""
    tab = await get_or_create_current_tab(db, member_id)
    new_total = float(tab.total_consumed) + amount
    await db.execute(
        update(MemberTab)
        .where(MemberTab.id == tab.id)
        .values(total_consumed=new_total)
    )
    await db.commit()
    await db.refresh(tab)
    return tab


async def get_tab_by_id(db: AsyncSession, tab_id: str) -> Optional[MemberTab]:
    result = await db.execute(select(MemberTab).where(MemberTab.id == tab_id))
    return result.scalar_one_or_none()


async def get_tabs_by_member(db: AsyncSession, member_id: str) -> list[MemberTab]:
    result = await db.execute(
        select(MemberTab)
        .where(MemberTab.member_id == member_id)
        .order_by(MemberTab.year.desc(), MemberTab.month.desc())
    )
    return list(result.scalars().all())


async def get_current_tab(db: AsyncSession, member_id: str) -> Optional[MemberTab]:
    now = datetime.utcnow()
    result = await db.execute(
        select(MemberTab).where(
            MemberTab.member_id == member_id,
            MemberTab.month == now.month,
            MemberTab.year == now.year,
        )
    )
    return result.scalar_one_or_none()


async def register_payment(
    db: AsyncSession, tab_id: str, data: MemberTabPayment
) -> Optional[MemberTab]:
    """Registra um pagamento na conta. Admin confirma manualmente."""
    tab = await get_tab_by_id(db, tab_id)
    if not tab:
        return None

    new_paid = float(tab.total_paid) + data.amount
    new_status = "paga" if new_paid >= float(tab.total_consumed) else "parcial"
    update_values: dict = {
        "total_paid": new_paid,
        "status": new_status,
    }
    if data.notes:
        update_values["notes"] = data.notes
    if new_status == "paga":
        update_values["closed_at"] = datetime.utcnow()

    await db.execute(
        update(MemberTab).where(MemberTab.id == tab_id).values(**update_values)
    )
    await db.commit()
    return await get_tab_by_id(db, tab_id)


async def get_orders_for_tab(db: AsyncSession, member_id: str, month: int, year: int) -> list[Order]:
    """Retorna os pedidos na conta de um membro em determinado mês."""
    from sqlalchemy import and_, extract
    result = await db.execute(
        select(Order).where(
            and_(
                Order.member_id == member_id,
                Order.payment_method == "conta",
                extract("month", Order.created_at) == month,
                extract("year", Order.created_at) == year,
            )
        ).order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())
