#!/bin/sh
set -e

echo "Aguardando banco de dados..."
# Espera até o banco estar disponível
python -c "
import asyncio, asyncpg, os, sys

async def wait():
    url = os.environ.get('DATABASE_URL','').replace('postgresql+asyncpg','postgresql')
    for i in range(30):
        try:
            conn = await asyncpg.connect(url)
            await conn.close()
            print('Banco conectado!')
            return
        except Exception as e:
            print(f'Aguardando... {i+1}/30...', flush=True)
            await asyncio.sleep(2)
    print('Banco nao respondeu')
    sys.exit(1)

asyncio.run(wait())
"

echo "Inicializando banco de dados..."
python init_db.py

echo "Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
