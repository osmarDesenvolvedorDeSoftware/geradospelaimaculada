from pydantic import BaseModel
from typing import Optional


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class ItemInCategory(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: float
    member_price: Optional[float] = None
    image_url: Optional[str]
    active: bool

    class Config:
        from_attributes = True


class CategoryResponse(CategoryBase):
    id: str
    items: list[ItemInCategory] = []

    class Config:
        from_attributes = True


class CategorySimple(BaseModel):
    id: str
    name: str
    active: bool

    class Config:
        from_attributes = True
