from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, date
from typing import Optional
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.security import verify_password, create_access_token, get_password_hash
from app.services.notification_service import manager
from app.schemas.order import OrderResponse, OrderSummary
from app import crud

router = APIRouter()


# ─── Auth ────────────────────────────────────────────────────────────────────────

@router.post("/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário inativo")

    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


# ─── Painel do Restaurante (requer auth) ─────────────────────────────────────────

@router.get("/restaurant/orders", response_model=list[OrderResponse])
async def listar_pedidos_ativos(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os pedidos ativos (ainda não entregues) para o painel."""
    return await crud.crud_order.get_active_orders(db)


@router.get("/restaurant/history", response_model=list[OrderResponse])
async def historico_pedidos(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna histórico de pedidos com filtros opcionais.
    Recebe datas no formato YYYY-MM-DD.
    """
    return await crud.crud_order.get_history(
        db, start_date=start_date, end_date=end_date, customer_name=customer_name
    )


# ─── WebSocket (painel do restaurante em tempo real) ─────────────────────────────

@router.websocket("/ws/restaurant")
async def websocket_restaurant(websocket: WebSocket):
    """
    Conexão WebSocket para o painel do restaurante.
    Recebe eventos: novo_pedido | pagamento_declarado | status_atualizado
    """
    await manager.connect(websocket)
    try:
        while True:
            # Mantém conexão aberta; o painel só escuta (não envia)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Gerenciamento de Membros (admin) ────────────────────────────────────────

@router.get("/restaurant/members", response_model=list)
async def listar_membros(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os membros cadastrados."""
    from app.schemas.member import MemberResponse
    members = await crud.crud_member.get_all(db)
    return [MemberResponse.model_validate(m) for m in members]


@router.post("/restaurant/members", response_model=dict)
async def criar_membro(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin cadastra um novo membro."""
    from app.schemas.member import MemberCreate, MemberResponse
    member_data = MemberCreate(**data)
    existing = await crud.crud_member.get_by_email(db, member_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    member = await crud.crud_member.create(db, member_data)
    return MemberResponse.model_validate(member).model_dump()


@router.patch("/restaurant/members/{member_id}", response_model=dict)
async def atualizar_membro(
    member_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin atualiza dados ou status (ativo/inativo) do membro."""
    from app.schemas.member import MemberUpdate, MemberResponse
    update_data = MemberUpdate(**data)
    member = await crud.crud_member.update_member(db, member_id, update_data)
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    return MemberResponse.model_validate(member).model_dump()


@router.delete("/restaurant/members/{member_id}")
async def deletar_membro(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin remove um membro."""
    deleted = await crud.crud_member.delete(db, member_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    return {"ok": True}


# ─── Contas dos Membros (admin) ───────────────────────────────────────────────

@router.get("/restaurant/members/{member_id}/tabs", response_model=list)
async def listar_contas_membro(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as contas (meses) de um membro."""
    from app.schemas.member import MemberTabResponse
    tabs = await crud.crud_member.get_tabs_by_member(db, member_id)
    return [MemberTabResponse.model_validate(t) for t in tabs]


@router.get("/restaurant/members/{member_id}/tabs/{tab_id}/orders", response_model=list)
async def pedidos_da_conta(
    member_id: str,
    tab_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna os pedidos de uma conta específica (extrato do membro)."""
    from app.schemas.member import MemberTabResponse
    from app.schemas.order import OrderSummary
    tab = await crud.crud_member.get_tab_by_id(db, tab_id)
    if not tab or tab.member_id != member_id:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    orders = await crud.crud_member.get_orders_for_tab(db, member_id, tab.month, tab.year)
    return [OrderSummary.model_validate(o) for o in orders]


@router.post("/restaurant/members/{member_id}/tabs/{tab_id}/pay", response_model=dict)
async def registrar_pagamento_conta(
    member_id: str,
    tab_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin confirma recebimento do pagamento da conta do membro
    (independente de ser Pix ou cartão — a confirmação é sempre manual).
    """
    from app.schemas.member import MemberTabPayment, MemberTabResponse
    payment = MemberTabPayment(**data)
    tab = await crud.crud_member.get_tab_by_id(db, tab_id)
    if not tab or tab.member_id != member_id:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    updated_tab = await crud.crud_member.register_payment(db, tab_id, payment)
    return MemberTabResponse.model_validate(updated_tab).model_dump()


@router.get("/restaurant/members/{member_id}/tabs/{tab_id}/pix")
async def gerar_pix_quitacao(
    member_id: str,
    tab_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gera QR Code Pix com o saldo devedor da conta do membro
    para o admin mostrar ao membro para quitar.
    """
    from app.services.pix_service import gerar_payload_pix, gerar_qr_code_base64
    tab = await crud.crud_member.get_tab_by_id(db, tab_id)
    if not tab or tab.member_id != member_id:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    saldo = float(tab.total_consumed) - float(tab.total_paid)
    if saldo <= 0:
        raise HTTPException(status_code=400, detail="Conta já está quitada")

    pix_payload = gerar_payload_pix(saldo, f"CONTA-{tab_id[:8].upper()}")
    qr_base64 = gerar_qr_code_base64(pix_payload)

    return {
        "pix_payload": pix_payload,
        "qr_code_base64": qr_base64,
        "saldo_devedor": saldo,
        "tab_id": tab_id,
    }

