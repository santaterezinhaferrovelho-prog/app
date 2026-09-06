from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, Header
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# --------- Config ---------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
APP_NAME = os.environ.get('APP_NAME', 'tanahora')

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
_storage_key = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --------- Storage helpers ---------
def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# --------- Password + JWT ---------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12),
               "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --------- Models ---------
class LoginBody(BaseModel):
    email: EmailStr
    password: str

class LojistaSettings(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    address: Optional[str] = None
    hours: Optional[str] = None
    open_days: Optional[List[int]] = None  # 0=Sunday .. 6=Saturday
    open_start: Optional[str] = None  # "HH:MM"
    open_end: Optional[str] = None    # "HH:MM"
    primary_color: Optional[str] = None
    delivery_fee: Optional[float] = None
    active: Optional[bool] = None

class CategoryBody(BaseModel):
    name: str
    order: int = 0
    active: bool = True
    icon: Optional[str] = None

class SizeVariation(BaseModel):
    name: str
    price: float

class Addon(BaseModel):
    name: str
    price: float

class ProductBody(BaseModel):
    name: str
    description: Optional[str] = ""
    category_id: str
    image_url: Optional[str] = None
    active: bool = True
    sizes: List[SizeVariation] = []
    addons: List[Addon] = []
    is_demo: bool = False

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    size_name: Optional[str] = None
    quantity: int
    unit_price: float
    addons: List[Addon] = []
    observation: Optional[str] = ""

class OrderBody(BaseModel):
    customer_name: str
    customer_phone: str
    order_type: str  # delivery | pickup
    address: Optional[str] = ""
    number: Optional[str] = ""
    complement: Optional[str] = ""
    neighborhood: Optional[str] = ""
    payment_method: str  # pix | cash | card
    change_for: Optional[float] = None
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float = 0
    total: float
    notes: Optional[str] = ""

# --------- App setup ---------
app = FastAPI()
api = APIRouter(prefix="/api")

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

async def get_lojista_for_user(user: dict) -> dict:
    if not user.get("lojista_id"):
        raise HTTPException(status_code=403, detail="User has no lojista assigned")
    lojista = await db.lojistas.find_one({"id": user["lojista_id"]}, {"_id": 0})
    if not lojista:
        raise HTTPException(status_code=404, detail="Lojista not found")
    return lojista

def clean(doc):
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc

# --------- Auth routes ---------
async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito ao super administrador")
    return user

class NewLojistaBody(BaseModel):
    slug: str
    name: str
    owner_email: EmailStr
    owner_password: str
    description: Optional[str] = ""
    address: Optional[str] = ""
    hours: Optional[str] = ""
    whatsapp: Optional[str] = ""

@api.post("/auth/login")
async def login(body: LoginBody, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    token = create_access_token(user["id"], user["email"])
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=43200, path="/")
    user.pop("_id", None); user.pop("password_hash", None)
    return {"user": user, "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# --------- Public storefront ---------
@api.get("/public/lojistas/{slug}")
async def public_lojista(slug: str):
    lojista = clean(await db.lojistas.find_one({"slug": slug, "active": True}))
    if not lojista:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    cats = await db.categories.find({"lojista_id": lojista["id"], "active": True},
                                    {"_id": 0}).sort("order", 1).to_list(200)
    prods = await db.products.find({"lojista_id": lojista["id"], "active": True},
                                   {"_id": 0}).to_list(1000)
    return {"lojista": lojista, "categories": cats, "products": prods}

@api.post("/public/lojistas/{slug}/orders")
async def create_public_order(slug: str, body: OrderBody):
    lojista = await db.lojistas.find_one({"slug": slug, "active": True})
    if not lojista:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    order_number = await db.counters.find_one_and_update(
        {"_id": f"orders_{lojista['id']}"},
        {"$inc": {"seq": 1}}, upsert=True, return_document=True)
    seq = (order_number or {}).get("seq", 1)
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "lojista_id": lojista["id"],
        "order_number": seq,
        "status": "new",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    await db.orders.insert_one(doc)
    doc.pop("_id", None)
    return doc

# --------- Admin: settings ---------
@api.get("/admin/lojista")
async def admin_get_lojista(user: dict = Depends(get_current_user)):
    return await get_lojista_for_user(user)

@api.put("/admin/lojista")
async def admin_update_lojista(body: LojistaSettings, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    updates = body.model_dump(exclude_unset=True)
    updates["updated_at"] = now_iso()
    await db.lojistas.update_one({"id": lojista["id"]}, {"$set": updates})
    return clean(await db.lojistas.find_one({"id": lojista["id"]}))

@api.delete("/admin/lojista/image/{kind}")
async def admin_delete_image(kind: str, user: dict = Depends(get_current_user)):
    if kind not in ("logo", "cover"):
        raise HTTPException(status_code=400, detail="Tipo inválido")
    lojista = await get_lojista_for_user(user)
    field = "logo_url" if kind == "logo" else "cover_url"
    await db.lojistas.update_one({"id": lojista["id"]}, {"$set": {field: None, "updated_at": now_iso()}})
    return clean(await db.lojistas.find_one({"id": lojista["id"]}))

# --------- Admin: categories ---------
@api.get("/admin/categories")
async def admin_list_categories(user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    return await db.categories.find({"lojista_id": lojista["id"]},
                                    {"_id": 0}).sort("order", 1).to_list(500)

@api.post("/admin/categories")
async def admin_create_category(body: CategoryBody, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    doc = body.model_dump()
    doc.update({"id": new_id(), "lojista_id": lojista["id"], "created_at": now_iso()})
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/admin/categories/{cid}")
async def admin_update_category(cid: str, body: CategoryBody, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    updates = body.model_dump()
    r = await db.categories.update_one({"id": cid, "lojista_id": lojista["id"]}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return clean(await db.categories.find_one({"id": cid}))

@api.delete("/admin/categories/{cid}")
async def admin_delete_category(cid: str, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    await db.categories.delete_one({"id": cid, "lojista_id": lojista["id"]})
    return {"ok": True}

# --------- Admin: products ---------
@api.get("/admin/products")
async def admin_list_products(user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    return await db.products.find({"lojista_id": lojista["id"]}, {"_id": 0}).to_list(2000)

@api.post("/admin/products")
async def admin_create_product(body: ProductBody, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    doc = body.model_dump()
    doc.update({"id": new_id(), "lojista_id": lojista["id"], "created_at": now_iso()})
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/admin/products/{pid}")
async def admin_update_product(pid: str, body: ProductBody, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    updates = body.model_dump()
    updates["updated_at"] = now_iso()
    r = await db.products.update_one({"id": pid, "lojista_id": lojista["id"]}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return clean(await db.products.find_one({"id": pid}))

@api.patch("/admin/products/{pid}/toggle")
async def admin_toggle_product(pid: str, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    p = await db.products.find_one({"id": pid, "lojista_id": lojista["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    await db.products.update_one({"id": pid}, {"$set": {"active": not p.get("active", True)}})
    return clean(await db.products.find_one({"id": pid}))

@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    await db.products.delete_one({"id": pid, "lojista_id": lojista["id"]})
    return {"ok": True}

# --------- Admin: uploads ---------
@api.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Apenas imagens são permitidas")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "jpg").lower()
    path = f"{APP_NAME}/lojistas/{lojista['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagem maior que 8MB")
    result = put_object(path, data, file.content_type)
    file_doc = {
        "id": new_id(),
        "lojista_id": lojista["id"],
        "storage_path": result["path"],
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "created_at": now_iso(),
        "is_deleted": False,
    }
    await db.files.insert_one(file_doc)
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}

@api.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, ct = get_object(path)
    return FastAPIResponse(content=data, media_type=record.get("content_type", ct))

# --------- Admin: orders ---------
VALID_STATUSES = ["new", "accepted", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]

@api.get("/admin/orders")
async def admin_list_orders(user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    return await db.orders.find({"lojista_id": lojista["id"]},
                                {"_id": 0}).sort("created_at", -1).to_list(500)

@api.patch("/admin/orders/{oid}/status")
async def admin_update_order_status(oid: str, body: dict, user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    status = body.get("status")
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Status inválido")
    r = await db.orders.update_one(
        {"id": oid, "lojista_id": lojista["id"]},
        {"$set": {"status": status, "updated_at": now_iso()}}
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return clean(await db.orders.find_one({"id": oid}))

@api.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(get_current_user)):
    lojista = await get_lojista_for_user(user)
    today = datetime.now(timezone.utc).date().isoformat()
    orders = await db.orders.find({"lojista_id": lojista["id"]}, {"_id": 0}).to_list(2000)
    today_orders = [o for o in orders if o.get("created_at", "").startswith(today)]
    sales_today = sum(o.get("total", 0) for o in today_orders if o.get("status") != "cancelled")
    pending = [o for o in orders if o.get("status") in ("new", "accepted", "preparing", "ready", "out_for_delivery")]
    active_products = await db.products.count_documents({"lojista_id": lojista["id"], "active": True})
    return {
        "orders_today": len(today_orders),
        "sales_today": sales_today,
        "pending_orders": len(pending),
        "active_products": active_products,
        "recent_orders": sorted(orders, key=lambda o: o.get("created_at", ""), reverse=True)[:5],
    }

# --------- Super admin ---------
@api.get("/super/lojistas")
async def super_list(user: dict = Depends(require_super_admin)):
    rows = await db.lojistas.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    ids = [r["id"] for r in rows]
    # Aggregate counts
    prod_counts = {}
    order_counts = {}
    async for p in db.products.aggregate([{"$match": {"lojista_id": {"$in": ids}}},
                                          {"$group": {"_id": "$lojista_id", "n": {"$sum": 1}}}]):
        prod_counts[p["_id"]] = p["n"]
    async for o in db.orders.aggregate([{"$match": {"lojista_id": {"$in": ids}}},
                                        {"$group": {"_id": "$lojista_id", "n": {"$sum": 1}}}]):
        order_counts[o["_id"]] = o["n"]
    for r in rows:
        r["product_count"] = prod_counts.get(r["id"], 0)
        r["order_count"] = order_counts.get(r["id"], 0)
    return rows

@api.post("/super/lojistas")
async def super_create(body: NewLojistaBody, user: dict = Depends(require_super_admin)):
    slug = body.slug.strip().lower()
    if not slug.replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Slug inválido (use letras, números e hífens)")
    if await db.lojistas.find_one({"slug": slug}):
        raise HTTPException(status_code=400, detail="Slug já em uso")
    email = body.owner_email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    lojista_id = new_id()
    lojista_doc = {
        "id": lojista_id, "slug": slug, "name": body.name,
        "description": body.description or "",
        "logo_url": None, "cover_url": None,
        "phone": "", "whatsapp": body.whatsapp or "", "instagram": "",
        "address": body.address or "", "hours": body.hours or "",
        "open_days": [], "open_start": "", "open_end": "",
        "primary_color": "#FF5500", "delivery_fee": 0.0,
        "active": True, "created_at": now_iso(),
    }
    await db.lojistas.insert_one(lojista_doc)
    await db.users.insert_one({
        "id": new_id(), "email": email,
        "password_hash": hash_password(body.owner_password),
        "name": body.name, "role": "owner",
        "lojista_id": lojista_id, "created_at": now_iso(),
    })
    return clean(lojista_doc)

@api.patch("/super/lojistas/{lid}/toggle")
async def super_toggle(lid: str, user: dict = Depends(require_super_admin)):
    l = await db.lojistas.find_one({"id": lid})
    if not l:
        raise HTTPException(status_code=404, detail="Lojista não encontrado")
    await db.lojistas.update_one({"id": lid}, {"$set": {"active": not l.get("active", True)}})
    return clean(await db.lojistas.find_one({"id": lid}))

@api.delete("/super/lojistas/{lid}")
async def super_delete(lid: str, user: dict = Depends(require_super_admin)):
    await db.lojistas.delete_one({"id": lid})
    await db.users.delete_many({"lojista_id": lid})
    await db.products.delete_many({"lojista_id": lid})
    await db.categories.delete_many({"lojista_id": lid})
    await db.orders.delete_many({"lojista_id": lid})
    return {"ok": True}

# --------- App wiring ---------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------- Seed demo lojista ---------
DEMO_SLUG = "tanahora"
DEMO_PRODUCTS = [
    "Bife Acebolado", "Filé de Frango Grelhado", "Picadinho de Carne",
    "Almôndegas ao Molho", "Parmegiana de Carne", "Parmegiana de Frango",
    "Feijoada", "Vaca Atolada", "Frango ao Molho", "Cupim ao Molho",
    "Fraldinha Assada", "Pernil Assado", "Filé Mignon Suíno",
    "Calabresa Acebolada", "Salsicha em Molho", "Carne Moída", "Toscana Assada"
]

async def seed():
    await db.users.create_index("email", unique=True)
    await db.lojistas.create_index("slug", unique=True)
    await db.products.create_index([("lojista_id", 1), ("category_id", 1)])
    await db.orders.create_index([("lojista_id", 1), ("created_at", -1)])

    # Seed lojista
    lojista = await db.lojistas.find_one({"slug": DEMO_SLUG})
    if not lojista:
        lojista_id = new_id()
        lojista_doc = {
            "id": lojista_id, "slug": DEMO_SLUG,
            "name": "Tá Na Hora",
            "description": "Bar e Lanchonete — Rápido, prático e delicioso!",
            "logo_url": None, "cover_url": None,
            "phone": "", "whatsapp": "", "instagram": "",
            "address": "Itu — SP",
            "hours": "Terça a sábado — 11:00 às 14:30",
            "open_days": [2, 3, 4, 5, 6],
            "open_start": "11:00",
            "open_end": "14:30",
            "primary_color": "#FF5500",
            "delivery_fee": 5.0,
            "active": True,
            "created_at": now_iso(),
        }
        await db.lojistas.insert_one(lojista_doc)
        lojista = lojista_doc

    # Seed owner user
    existing_user = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing_user:
        await db.users.insert_one({
            "id": new_id(),
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Proprietário Tá Na Hora",
            "role": "owner",
            "lojista_id": lojista["id"],
            "is_super_admin": True,
            "created_at": now_iso(),
        })
    else:
        updates = {}
        if not verify_password(ADMIN_PASSWORD, existing_user["password_hash"]):
            updates["password_hash"] = hash_password(ADMIN_PASSWORD)
        if not existing_user.get("lojista_id"):
            updates["lojista_id"] = lojista["id"]
            updates["role"] = "owner"
        if not existing_user.get("is_super_admin"):
            updates["is_super_admin"] = True
        if updates:
            await db.users.update_one({"email": ADMIN_EMAIL.lower()}, {"$set": updates})

    # Seed category "Marmitas" and products
    cat = await db.categories.find_one({"lojista_id": lojista["id"], "name": "Marmitas"})
    if not cat:
        cat_id = new_id()
        cat_doc = {
            "id": cat_id, "lojista_id": lojista["id"], "name": "Marmitas",
            "icon": "🍛", "order": 0, "active": True, "created_at": now_iso(),
        }
        await db.categories.insert_one(cat_doc)
        cat = cat_doc

    count = await db.products.count_documents({"lojista_id": lojista["id"]})
    if count == 0:
        for i, name in enumerate(DEMO_PRODUCTS):
            await db.products.insert_one({
                "id": new_id(),
                "lojista_id": lojista["id"],
                "category_id": cat["id"],
                "name": name,
                "description": f"{name} acompanhado de arroz, feijão, farofa e acompanhamento.",
                "image_url": None,
                "active": True,
                "sizes": [
                    {"name": "P", "price": 20.0},
                    {"name": "M", "price": 25.0},
                    {"name": "G", "price": 30.0},
                ],
                "addons": [
                    {"name": "Ovo", "price": 2.0},
                    {"name": "Bacon", "price": 5.0},
                    {"name": "Queijo", "price": 4.0},
                    {"name": "Batata frita", "price": 6.0},
                ],
                "is_demo": True,
                "created_at": now_iso(),
            })

@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed()
    logger.info("Seed complete")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
