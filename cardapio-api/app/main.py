import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.endpoints import menu, orders, restaurant, uploads, members

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Cardápio Digital API",
    description="API do sistema de cardápio digital com pedidos e Pix",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Serve static uploads ─────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(menu.router, prefix="/api", tags=["Cardápio"])
app.include_router(orders.router, prefix="/api", tags=["Pedidos"])
app.include_router(restaurant.router, prefix="/api", tags=["Restaurante"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(members.router, prefix="/api", tags=["Membros"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Cardapio API rodando"}
