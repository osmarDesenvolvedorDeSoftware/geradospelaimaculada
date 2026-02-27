"""
Script de inicialização do banco de dados.
Cria todas as tabelas e o usuário admin padrão.

Uso: python init_db.py
"""
import asyncio
import os
import sys

# Garante que o diretório raiz está no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import Base
from app.db.session import engine
from app.models import category, item, order, user, member  # noqa: importa todos os modelos
from app.core.security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from sqlalchemy import select, text


async def create_admin(session: AsyncSession):
    """Cria o usuário admin padrão se não existir."""
    result = await session.execute(select(User).where(User.username == "admin"))
    existing = result.scalar_one_or_none()

    if not existing:
        admin = User(
            username="admin",
            hashed_password=get_password_hash(os.getenv("ADMIN_PASSWORD", "Gerados356@")),
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f"[OK] Usuario admin criado (usuario: admin / senha: {os.getenv('ADMIN_PASSWORD', 'Gerados356@')})")
        print("[AVISO] ALTERE A SENHA em producao!")
    else:
        print("[INFO] Usuario admin ja existe, pulando criacao")


async def apply_migrations(conn) -> None:
    """Aplica migrações incrementais. Seguro executar múltiplas vezes (IF NOT EXISTS)."""
    print("Aplicando migracoes incrementais...")
    migrations = [
        # v1 - Sistema de membros
        "ALTER TABLE items ADD COLUMN IF NOT EXISTS member_price NUMERIC(10, 2)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR NOT NULL DEFAULT 'pix'",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS member_id VARCHAR",
    ]
    for sql in migrations:
        try:
            await conn.execute(text(sql))
        except Exception as e:
            print(f"   [ERRO] {sql[:60]}... -> {e}")
    print("Migracoes aplicadas!")


async def main():
    print("Criando tabelas no banco de dados...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await apply_migrations(conn)
    print("Tabelas criadas com sucesso!")

    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with AsyncSessionLocal() as session:
        await create_admin(session)

    print("\nBanco de dados pronto! Acesse:")
    print("   Cardápio: http://localhost:3000")
    print("   Painel:   http://localhost:3000/#/restaurante")
    print("   API Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())
