from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate, OrderSummary, ORDER_STATUSES
from app.services.pix_service import gerar_payload_pix, gerar_qr_code_base64
from app.services.notification_service import manager
from app import crud

router = APIRouter()


@router.post("/orders", response_model=OrderResponse, status_code=201)
async def criar_pedido(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo pedido, calcula o total e gera o QR Code Pix (ou lança na conta do membro)."""

    # Valida payment_method
    if data.payment_method not in ("pix", "conta"):
        raise HTTPException(status_code=400, detail="payment_method deve ser 'pix' ou 'conta'")

    # Pedido na conta exige membro logado
    if data.payment_method == "conta" and not data.member_id:
        raise HTTPException(status_code=400, detail="Para lançar na conta é necessário estar logado como membro")

    # Busca e valida os itens do pedido
    item_ids = [oi.item_id for oi in data.items]
    items_db = await crud.crud_item.get_by_ids(db, item_ids)
    items_map = {item.id: item for item in items_db}

    for oi in data.items:
        if oi.item_id not in items_map:
            raise HTTPException(status_code=404, detail=f"Item '{oi.item_id}' não encontrado")
        if not items_map[oi.item_id].active:
            raise HTTPException(status_code=400, detail=f"Item '{items_map[oi.item_id].name}' não está disponível")

    # Calcula o total: usa member_price se for membro e o item tiver preço de membro
    is_member = bool(data.member_id)
    def get_price(item_id: str) -> float:
        item = items_map[item_id]
        if is_member and item.member_price is not None:
            return float(item.member_price)
        return float(item.price)

    total = sum(get_price(oi.item_id) * oi.quantity for oi in data.items)

    # Pedido na conta: sem Pix, status inicial = "conta"
    if data.payment_method == "conta":
        order = await crud.crud_order.create(db, data, items_db, pix_payload=None, unit_price_fn=get_price)

        # Lança o valor na conta mensal do membro
        await crud.crud_member.add_to_tab(db, data.member_id, total)

        await manager.broadcast("novo_pedido", {
            "order_id": order.id,
            "table_number": order.table_number,
            "customer_name": order.customer_name,
            "total": float(order.total),
            "status": order.status,
            "payment_method": "conta",
        })
        return order

    # Pedido via Pix: gera QR Code
    import uuid
    temp_order_id = str(uuid.uuid4())
    pix_payload = gerar_payload_pix(total, temp_order_id)

    order = await crud.crud_order.create(db, data, items_db, pix_payload=pix_payload, unit_price_fn=get_price)

    await manager.broadcast("novo_pedido", {
        "order_id": order.id,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "total": float(order.total),
        "status": order.status,
        "payment_method": "pix",
    })

    return order


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def buscar_pedido(order_id: str, db: AsyncSession = Depends(get_db)):
    """Retorna os dados de um pedido pelo ID (usado pelo cliente para acompanhar)."""
    order = await crud.crud_order.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.get("/orders/session/{session_id}", response_model=list[OrderSummary])
async def buscar_pedidos_da_sessao(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retorna os pedidos de uma sessão (cliente acompanha pelo localStorage)."""
    return await crud.crud_order.get_by_session(db, session_id)


@router.post("/orders/{order_id}/declare-payment", response_model=OrderResponse)
async def declarar_pagamento(order_id: str, db: AsyncSession = Depends(get_db)):
    """
    Cliente clicou em 'Já paguei! Avisar o restaurante'.
    Muda status para 'pagamento_declarado' e notifica o painel.
    """
    order = await crud.crud_order.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if order.status != "aguardando_pagamento":
        raise HTTPException(status_code=400, detail="Pedido não está aguardando pagamento")

    order = await crud.crud_order.update_status(db, order_id, "pagamento_declarado")

    await manager.broadcast("pagamento_declarado", {
        "order_id": order.id,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "total": float(order.total),
    })

    return order


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def atualizar_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Restaurante atualiza o status do pedido (protegido no painel)."""
    if data.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status inválido. Válidos: {ORDER_STATUSES}"
        )

    order = await crud.crud_order.update_status(db, order_id, data.status)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    await manager.broadcast("status_atualizado", {
        "order_id": order.id,
        "status": order.status,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
    })

    return order



@router.post("/orders", response_model=OrderResponse, status_code=201)
async def criar_pedido(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo pedido, calcula o total e gera o QR Code Pix."""
    # Busca todos os itens do pedido no banco
    item_ids = [oi.item_id for oi in data.items]
    items_db = await crud.crud_item.get_by_ids(db, item_ids)

    # Valida que todos os itens existem e estão ativos
    items_map = {item.id: item for item in items_db}
    for oi in data.items:
        if oi.item_id not in items_map:
            raise HTTPException(status_code=404, detail=f"Item '{oi.item_id}' não encontrado")
        if not items_map[oi.item_id].active:
            raise HTTPException(status_code=400, detail=f"Item '{items_map[oi.item_id].name}' não está disponível")

    # Calcula o total para gerar o Pix
    total = sum(float(items_map[oi.item_id].price) * oi.quantity for oi in data.items)

    # Gera o payload Pix com o valor exato do pedido
    # O ID do pedido ainda não existe, usamos um placeholder temporário
    # O CRUD vai gerar o UUID real
    import uuid
    temp_order_id = str(uuid.uuid4())
    pix_payload = gerar_payload_pix(total, temp_order_id)

    # Cria o pedido no banco
    order = await crud.crud_order.create(db, data, items_db, pix_payload)

    # Notifica o painel do restaurante via WebSocket
    await manager.broadcast("novo_pedido", {
        "order_id": order.id,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "total": float(order.total),
        "status": order.status,
    })

    return order


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def buscar_pedido(order_id: str, db: AsyncSession = Depends(get_db)):
    """Retorna os dados de um pedido pelo ID (usado pelo cliente para acompanhar)."""
    order = await crud.crud_order.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.get("/orders/session/{session_id}", response_model=list[OrderSummary])
async def buscar_pedidos_da_sessao(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retorna os pedidos de uma sessão (cliente acompanha pelo localStorage)."""
    return await crud.crud_order.get_by_session(db, session_id)


@router.post("/orders/{order_id}/declare-payment", response_model=OrderResponse)
async def declarar_pagamento(order_id: str, db: AsyncSession = Depends(get_db)):
    """
    Cliente clicou em 'Já paguei! Avisar o restaurante'.
    Muda status para 'pagamento_declarado' e notifica o painel.
    """
    order = await crud.crud_order.get_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if order.status != "aguardando_pagamento":
        raise HTTPException(status_code=400, detail="Pedido não está aguardando pagamento")

    order = await crud.crud_order.update_status(db, order_id, "pagamento_declarado")

    # Alerta o restaurante com destaque
    await manager.broadcast("pagamento_declarado", {
        "order_id": order.id,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "total": float(order.total),
    })

    return order


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def atualizar_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Restaurante atualiza o status do pedido (protegido no painel)."""
    if data.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status inválido. Válidos: {ORDER_STATUSES}"
        )

    order = await crud.crud_order.update_status(db, order_id, data.status)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    # Notifica o cliente e outros painéis sobre a atualização
    await manager.broadcast("status_atualizado", {
        "order_id": order.id,
        "status": order.status,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
    })

    return order
