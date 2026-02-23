from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate
from app.schemas.item import ItemResponse, ItemCreate, ItemUpdate
from app import crud

router = APIRouter()


# ─── Cardápio público (sem auth) ────────────────────────────────────────────────

@router.get("/menu", response_model=list[CategoryResponse])
async def listar_cardapio(db: AsyncSession = Depends(get_db)):
    """Retorna todas as categorias ativas com seus itens ativos."""
    result = await db.execute(
        select(Category)
        .where(Category.active == True)
        .options(selectinload(Category.items))
        .order_by(Category.name)
    )
    categories = result.scalars().all()
    for cat in categories:
        cat.items = [i for i in cat.items if i.active]
    return categories


# ─── Gestão de Categorias (requer autenticação) ─────────────────────────────────

@router.get("/categories", response_model=list[CategoryResponse])
async def listar_categorias(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).options(selectinload(Category.items)).order_by(Category.name)
    )
    return result.scalars().all()


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def criar_categoria(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await crud.crud_category.create(db, data)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def atualizar_categoria(
    category_id: str,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    category = await crud.crud_category.update_category(db, category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return category


@router.delete("/categories/{category_id}", status_code=204)
async def deletar_categoria(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    deleted = await crud.crud_category.delete(db, category_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")


# ─── Gestão de Itens (requer autenticação) ───────────────────────────────────────

@router.get("/items", response_model=list[ItemResponse])
async def listar_itens(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await crud.crud_item.get_all(db)


@router.post("/items", response_model=ItemResponse, status_code=201)
async def criar_item(
    data: ItemCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await crud.crud_item.create(db, data)


@router.put("/items/{item_id}", response_model=ItemResponse)
async def atualizar_item(
    item_id: str,
    data: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = await crud.crud_item.update_item(db, item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item


@router.delete("/items/{item_id}", status_code=204)
async def deletar_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    deleted = await crud.crud_item.delete(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item não encontrado")
