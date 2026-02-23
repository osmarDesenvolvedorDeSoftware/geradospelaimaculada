import uuid
import uuid
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models.order import Order, OrderItem
from app.models.item import Item
from app.schemas.order import OrderCreate, ORDER_STATUSES
from typing import Optional


async def get_by_id(db: AsyncSession, order_id: str) -> Optional[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items).selectinload(OrderItem.item))
    )
    return result.scalar_one_or_none()


async def get_by_session(db: AsyncSession, session_id: str) -> list[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.session_id == session_id)
        .order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


async def get_active_orders(db: AsyncSession) -> list[Order]:
    """Retorna todos os pedidos que ainda não foram entregues para o painel do restaurante."""
    result = await db.execute(
        select(Order)
        .where(Order.status.notin_(["entregue", "cancelado"]))
        .options(selectinload(Order.items).selectinload(OrderItem.item))
        .order_by(Order.created_at.asc())
    )
    return list(result.scalars().all())


async def create(
    db: AsyncSession, data: OrderCreate, items_db: list[Item], pix_payload: str
) -> Order:
    # Calcula o total com base nos preços atuais dos itens
    items_map = {item.id: item for item in items_db}
    total = sum(
        float(items_map[oi.item_id].price) * oi.quantity for oi in data.items
    )

    order = Order(
        id=str(uuid.uuid4()),
        session_id=data.session_id,
        table_number=data.table_number,
        customer_name=data.customer_name,
        observations=data.observations,
        status="aguardando_pagamento",
        total=total,
        pix_payload=pix_payload,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(order)
    await db.flush()  # gera o ID sem commitar

    for oi in data.items:
        item = items_map[oi.item_id]
        order_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order.id,
            item_id=oi.item_id,
            quantity=oi.quantity,
            unit_price=float(item.price),
        )
        db.add(order_item)

    await db.commit()

    # Usamos get_by_id para retornar o pedido com todos os relacionamentos carregados (eager loading)
    # evitar erro MissingGreenlet do SQLAlchemy async
    return await get_by_id(db, order.id)


async def update_status(
    db: AsyncSession, order_id: str, new_status: str
) -> Optional[Order]:
    if new_status not in ORDER_STATUSES:
        return None
    await db.execute(
        update(Order)
        .where(Order.id == order_id)
        .values(status=new_status, updated_at=datetime.utcnow())
    )
    await db.commit()
    return await get_by_id(db, order_id)


async def get_history(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer_name: Optional[str] = None,
) -> list[Order]:
    query = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.item))
        .order_by(Order.created_at.desc())
    )

    if start_date:
        # Converte date -> datetime (00:00:00) naive
        start_dt = datetime.combine(start_date, datetime.min.time())
        query = query.where(Order.created_at >= start_dt)
        
    if end_date:
        # Converte date -> datetime (23:59:59.999999) naive
        end_dt = datetime.combine(end_date, datetime.max.time())
        query = query.where(Order.created_at <= end_dt)
    
    if customer_name:
        query = query.where(Order.customer_name.ilike(f"%{customer_name}%"))

    # Opcional: Filtrar apenas pedidos concluídos
    
    result = await db.execute(query)
    orders = list(result.scalars().all())
    
    return orders
