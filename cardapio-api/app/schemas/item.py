from pydantic import BaseModel
from typing import Optional


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    member_price: Optional[float] = None  # None = sem desconto para membros
    image_url: Optional[str] = None
    active: bool = True
    category_id: str


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    member_price: Optional[float] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None
    category_id: Optional[str] = None


class ItemResponse(ItemBase):
    id: str

    class Config:
        from_attributes = True
