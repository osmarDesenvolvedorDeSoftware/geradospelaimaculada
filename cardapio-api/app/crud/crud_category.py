from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from typing import Optional


async def get_all(db: AsyncSession, only_active: bool = False) -> list[Category]:
    stmt = select(Category).options(selectinload(Category.items))
    if only_active:
        stmt = stmt.where(Category.active == True)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, category_id: str) -> Optional[Category]:
    result = await db.execute(
        select(Category)
        .where(Category.id == category_id)
        .options(selectinload(Category.items))
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: CategoryCreate) -> Category:
    category = Category(**data.model_dump())
    db.add(category)
    await db.commit()
    # Busca novamente para garantir que relacionamentos (items) sejam carregados com eager loading
    return await get_by_id(db, category.id)


async def update_category(
    db: AsyncSession, category_id: str, data: CategoryUpdate
) -> Optional[Category]:
    values = {k: v for k, v in data.model_dump().items() if v is not None}
    if not values:
        return await get_by_id(db, category_id)
    await db.execute(
        update(Category).where(Category.id == category_id).values(**values)
    )
    await db.commit()
    return await get_by_id(db, category_id)


async def delete(db: AsyncSession, category_id: str) -> bool:
    category = await get_by_id(db, category_id)
    if not category:
        return False
    await db.delete(category)
    await db.commit()
    return True
