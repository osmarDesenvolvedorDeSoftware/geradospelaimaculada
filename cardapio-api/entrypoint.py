"""
Entrypoint do container da API.
Aguarda o banco, cria tabelas e usuario admin, depois inicia o servidor.
"""
import asyncio
import os
import sys
import subprocess


async def wait_for_db():
    """Aguarda o banco de dados estar pronto."""
    import asyncpg
    url = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg", "postgresql")
    for i in range(30):
        try:
            conn = await asyncpg.connect(url)
            await conn.close()
            print("✅ Banco conectado!", flush=True)
            return
        except Exception:
            print(f"⏳ Aguardando banco... {i+1}/30", flush=True)
            await asyncio.sleep(2)
    print("❌ Banco não respondeu após 60s", flush=True)
    sys.exit(1)


asyncio.run(wait_for_db())

# Roda init_db.py
print("🗄️  Inicializando banco de dados...", flush=True)
result = subprocess.run([sys.executable, "init_db.py"])
if result.returncode != 0:
    sys.exit(result.returncode)

# Inicia o servidor FastAPI
print("🚀 Iniciando API...", flush=True)
os.execv(
    sys.executable,
    [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ],
)
