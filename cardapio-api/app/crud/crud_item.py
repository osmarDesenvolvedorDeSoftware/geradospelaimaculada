from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate
from typing import Optional


async def get_all(db: AsyncSession, only_active: bool = False) -> list[Item]:
    stmt = select(Item)
    if only_active:
        stmt = stmt.where(Item.active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, item_id: str) -> Optional[Item]:
    result = await db.execute(select(Item).where(Item.id == item_id))
    return result.scalar_one_or_none()


async def get_by_ids(db: AsyncSession, item_ids: list[str]) -> list[Item]:
    result = await db.execute(select(Item).where(Item.id.in_(item_ids)))
    return list(result.scalars().all())


async def create(db: AsyncSession, data: ItemCreate) -> Item:
    item = Item(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_item(
    db: AsyncSession, item_id: str, data: ItemUpdate
) -> Optional[Item]:
    values = {k: v for k, v in data.model_dump().items() if v is not None}
    if not values:
        return await get_by_id(db, item_id)
    await db.execute(update(Item).where(Item.id == item_id).values(**values))
    await db.commit()
    return await get_by_id(db, item_id)


async def delete(db: AsyncSession, item_id: str) -> bool:
    item = await get_by_id(db, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True
