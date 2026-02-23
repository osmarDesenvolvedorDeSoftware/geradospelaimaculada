import json
from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    """Gerencia conexões WebSocket ativas do painel do restaurante."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event: str, data: dict):
        """Envia um evento JSON para todos os painéis conectados."""
        message = json.dumps({"event": event, "data": data})
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


# Instância global — compartilhada por todos os endpoints
manager = ConnectionManager()
