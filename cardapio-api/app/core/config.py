from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import Optional


class Settings(BaseSettings):
    # Banco de Dados
    DATABASE_URL: str

    # Segurança
    SECRET_KEY: str
    ADMIN_PASSWORD: str = "Gerados356@"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas

    # Pix
    PIX_KEY: str
    PIX_KEY_TYPE: str = "email"
    RESTAURANT_NAME: str = "Restaurante"
    RESTAURANT_CITY: str = "Brasil"

    # CORS / Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
