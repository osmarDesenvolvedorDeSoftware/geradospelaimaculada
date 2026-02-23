# Gerados pela imaculada 🍽️

Sistema de Cardápio Digital moderno, robusto e mobile-first para restaurantes, com geração local de Pix e acompanhamento de pedidos em tempo real.

## 🚀 Visão Geral

O sistema permite que clientes acessem o cardápio via QR Code, façam pedidos e realizem o pagamento via Pix sem taxas de intermediação. O restaurante gerencia tudo através de um painel administrativo protegido.

### Principais Funcionalidades
- **Cardápio Digital:** Listagem categorizada de produtos.
- **Pagamento Pix:** Geração local de QR Code Pix (sem gateway, custo zero).
- **Acompanhamento:** Status do pedido em tempo real para o cliente.
- **Painel Administrativo:** Gestão de pedidos, produtos, categorias e geração de QR Codes para as mesas.
- **Notificações:** Alertas via WebSocket no painel quando um novo pedido chega ou um pagamento é declarado.

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Shadcn/UI, Zustand, TanStack Query |
| **Backend** | Python, FastAPI, SQLAlchemy (Async), Pydantic, WebSockets |
| **Banco de Dados** | PostgreSQL 16 |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## 📂 Estrutura do Projeto

O sistema é dividido em dois grandes módulos conteinerizados:

```text
/
├── cardapio-api/          # Backend FastAPI (Python)
│   ├── app/
│   │   ├── api/           # Endpoints da REST API e WebSocket
│   │   ├── core/          # Configurações de segurança e variáveis de ambiente
│   │   ├── db/            # Conexão e sessão do banco de dados
│   │   ├── models/        # Modelos do banco (SQLAlchemy)
│   │   ├── schemas/       # Esquemas de validação (Pydantic)
│   │   └── services/      # Lógica de negócio (Pix, Notificações)
│   ├── alembic/           # Migrações do Banco de Dados
│   └── Dockerfile         # Definição do container backend
│
├── cardapio-web/          # Frontend React (client + admin)
│   ├── src/
│   │   ├── components/    # Componentes de UI (Shadcn)
│   │   ├── features/      # Lógica por funcionalidade (menu, cart, restaurant...)
│   │   ├── hooks/         # Hooks personalizados (sessão, websocket)
│   │   ├── store/         # Gerenciamento de estado (carrinho)
│   │   └── services/      # Integração com a API (Axios/React Query)
│   ├── nginx.conf         # Configuração do Proxy Reverso interno
│   └── Dockerfile         # Build multi-stage para produção
│
└── docker-compose.yml     # Orquestração de todo o sistema
```

---

## ⚙️ Configuração (Setup)

### 1. Requisitos
- Docker e Docker Compose instalados.

### 2. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto seguindo este modelo:

```env
# Banco de Dados
POSTGRES_USER=cardapio
POSTGRES_PASSWORD=suasenha
POSTGRES_DB=cardapio_db

# Segurança (gere uma chave forte)
SECRET_KEY=sua-chave-secreta-longa

# Dados do Restaurante (Para o Pix)
PIX_KEY=sua-chave-pix@email.com
PIX_KEY_TYPE=email
RESTAURANT_NAME=Gerados pela imaculada
RESTAURANT_CITY=Sua Cidade
```

### 3. Rodando o Sistema
Basta executar o comando abaixo na raiz do projeto:

```bash
docker-compose up -d --build
```

O sistema estará disponível em:
- **Cardápio (Cliente):** `http://localhost:3000`
- **Painel (Admin):** `http://localhost:3000/#/restaurante`
- **Documentação API (Swagger):** `http://localhost:8000/docs`

---

## 🚢 Deploy no VPS

Para hospedar o sistema:
1. Aponte o Nginx do seu VPS para a porta `3000`.
2. Habilite o suporte a **WebSockets** no seu proxy reverso.
3. Configure o **SSL (HTTPS)** usando Certbot/Let's Encrypt para garantir o funcionamento seguro do cardápio nos celulares.

---

## 📄 Licença
Desenvolvido para **Gerados pela imaculada**.
