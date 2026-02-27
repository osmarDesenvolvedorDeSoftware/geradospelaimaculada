from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_member
from app.core.security import verify_password, create_access_token
from app.schemas.member import MemberLogin, MemberResponse, MemberTabResponse
from app.schemas.order import OrderSummary
from app import crud

router = APIRouter()


@router.post("/members/login")
async def member_login(data: MemberLogin, db: AsyncSession = Depends(get_db)):
    """Membro faz login com e-mail e senha."""
    member = await crud.crud_member.get_by_email(db, data.email)
    if not member or not verify_password(data.password, member.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    if not member.is_active:
        raise HTTPException(status_code=403, detail="Conta inativa. Fale com o responsável.")

    # JWT com role="member" para distinguir de admin
    token = create_access_token({"sub": member.id, "role": "member"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "member": MemberResponse.model_validate(member),
    }


@router.get("/members/me", response_model=MemberResponse)
async def get_my_profile(member=Depends(get_current_member)):
    """Retorna o perfil do membro autenticado."""
    return member


@router.get("/members/me/tab", response_model=MemberTabResponse)
async def get_my_tab(
    member=Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Retorna a conta do mês atual do membro autenticado."""
    tab = await crud.crud_member.get_current_tab(db, member.id)
    if not tab:
        # Retorna uma conta zerada se ainda não consumiu nada este mês
        from app.models.member import MemberTab
        from datetime import datetime
        now = datetime.utcnow()
        tab = MemberTab(
            id="",
            member_id=member.id,
            month=now.month,
            year=now.year,
            total_consumed=0,
            total_paid=0,
            status="aberta",
        )
    return tab


@router.get("/members/me/tab/orders", response_model=list[OrderSummary])
async def get_my_tab_orders(
    member=Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Retorna os pedidos lançados na conta do mês atual."""
    from datetime import datetime
    now = datetime.utcnow()
    orders = await crud.crud_member.get_orders_for_tab(db, member.id, now.month, now.year)
    return orders


@router.get("/members/me/tabs", response_model=list[MemberTabResponse])
async def get_my_tabs_history(
    member=Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Retorna histórico de todas as contas do membro (todos os meses)."""
    return await crud.crud_member.get_tabs_by_member(db, member.id)
