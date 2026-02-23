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
