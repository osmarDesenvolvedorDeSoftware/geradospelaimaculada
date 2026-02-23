# ── Backend (FastAPI) ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS api

WORKDIR /app

# Instala dependências do sistema (necessárias para asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Usa Python como entrypoint para evitar problemas de CRLF (Windows)
ENTRYPOINT ["python", "entrypoint.py"]
