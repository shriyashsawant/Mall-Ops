# Vercel Serverless Function Entry Point
# This wraps the FastAPI app for Vercel deployment

import sys
import os

# Add the parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import resend
import os
import logging
from pathlib import Path
import enum

logger = logging.getLogger(__name__)

# ==================== DATABASE SETUP ====================

# Use DATABASE_URL if provided, otherwise build from individual vars
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    DATABASE_URL = f"postgresql://{os.environ.get('POSTGRES_USER')}:{os.environ.get('POSTGRES_PASSWORD')}@{os.environ.get('POSTGRES_HOST')}:{os.environ.get('POSTGRES_PORT')}/{os.environ.get('POSTGRES_DB')}"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configure Resend
resend.api_key = os.environ.get('RESEND_API_KEY', '')

# ==================== MODELS ====================

class UserRole(enum.Enum):
    manager = "manager"
    supervisor = "supervisor"

class TaskPriority(enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    picture = Column(String)
    role = Column(String, default="supervisor")
    password_hash = Column(String)
    mall_name = Column(String, default="")
    
class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    mall_name = Column(String, default="")
    latitude = Column(Float)
    longitude = Column(Float)
    radius = Column(Integer, default=100)
    mall_id = Column(String)
    store_code = Column(Integer)
    
    tasks = relationship("Task", back_populates="store")

class Task(Base):
    __tablename__ = "tasks"
    
    task_id = Column(String, primary_key=True)
    store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    supervisor_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    deadline = Column(DateTime, nullable=False)
    priority = Column(String, default="medium")
    photo_required = Column(Boolean, default=True)
    before_after_photos = Column(Boolean, default=False)
    max_photos = Column(Integer, default=5)
    created_by = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime)
    store_code = Column(Integer, nullable=True)
    store_name = Column(String, nullable=True)
    city = Column(String, default="Pune")
    state = Column(String, default="ROOM 1 (Rest of Maharastra - 1)")
    checklist_date = Column(String, nullable=True)
    
    store = relationship("Store", back_populates="tasks")

class Mall(Base):
    __tablename__ = "malls"
    
    mall_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    city = Column(String, default="Pune")
    latitude = Column(Float)
    longitude = Column(Float)
    radius = Column(Integer, default=150)

class SupervisorAssignment(Base):
    __tablename__ = "supervisor_assignments"
    
    assignment_id = Column(String, primary_key=True)
    supervisor_id = Column(String, ForeignKey("users.user_id"))
    store_id = Column(String, ForeignKey("stores.store_id"))
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

class TaskSubmission(Base):
    __tablename__ = "submissions"
    
    submission_id = Column(String, primary_key=True)
    task_id = Column(String, ForeignKey("tasks.task_id"))
    supervisor_id = Column(String, ForeignKey("users.user_id"))
    photos = Column(Text)
    before_photos = Column(Text)
    remarks = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    location_address = Column(String)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="pending")

# ==================== PYDANTIC MODELS ====================

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str = "supervisor"

class SupervisorCreate(BaseModel):
    email: str
    name: str
    password: str

class TaskCreate(BaseModel):
    store_id: Optional[str] = None
    supervisor_id: Optional[str] = None
    title: str
    description: str
    deadline: datetime
    priority: str = "medium"
    photo_required: bool = True
    before_after_photos: bool = False
    max_photos: int = 5
    store_code: Optional[int] = None
    store_name: Optional[str] = None
    city: str = "Pune"
    state: str = "ROOM 1 (Rest of Maharastra - 1)"
    checklist_date: Optional[str] = None

class SubmissionCreate(BaseModel):
    task_id: str
    photos: List[str] = []
    before_photos: List[str] = []
    remarks: Optional[str] = None
    latitude: float
    longitude: float
    location_address: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def require_auth(request: Request, db: Session):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = db.query(User).filter(User.user_id == session_token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user

def require_manager(request: Request, db: Session):
    user = require_auth(request, db)
    if user.role != "manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    return user

# ==================== APP SETUP ====================

app = FastAPI()
api_router = APIRouter(prefix="/api")

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://mall-ops.vercel.app",
    "https://mall-ops-api.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTH ROUTES ====================

@app.post("/api/auth/login")
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    MANAGER_PASSWORD = "Maruti@123"
    
    if request.email == "Maruti.Patil@clrservices.com" and request.password != MANAGER_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            user_id=user_id,
            email=request.email,
            name=request.email.split('@')[0],
            picture=f"https://api.dicebear.com/7.x/initials/svg?seed={request.email.split('@')[0]}",
            role="manager" if request.email == "Maruti.Patil@clrservices.com" else request.role,
            password_hash=request.password,
            mall_name=""
        )
        db.add(user)
        db.commit()
    
    response.set_cookie(key="session_token", value=user.user_id, httponly=True, samesite="lax")
    
    return {"user": {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture, "role": user.role, "mall_name": user.mall_name}, "session_token": user.user_id}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("session_token")
    return {"message": "Logged out"}

@app.get("/api/auth/me")
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    return {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture, "role": user.role, "mall_name": user.mall_name}

# ==================== TASKS ROUTES ====================

@app.get("/api/tasks")
async def get_tasks(request: Request, store_id: Optional[str] = None, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    query = db.query(Task)
    
    if user.role == "supervisor":
        query = query.filter(Task.supervisor_id == user.user_id)
    
    if store_id:
        query = query.filter(Task.store_id == store_id)
    
    tasks = query.all()
    return [{
        "task_id": t.task_id, "store_id": t.store_id, "supervisor_id": t.supervisor_id, "title": t.title, "description": t.description,
        "deadline": t.deadline, "priority": t.priority, "photo_required": t.photo_required,
        "before_after_photos": t.before_after_photos, "max_photos": t.max_photos, "created_at": t.created_at,
        "store_code": t.store_code, "store_name": t.store_name, "city": t.city, "state": t.state, "checklist_date": t.checklist_date
    } for t in tasks]

@app.post("/api/tasks")
async def create_task(task: TaskCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    new_task = Task(
        task_id=task_id,
        store_id=task.store_id,
        supervisor_id=task.supervisor_id,
        title=task.title,
        description=task.description,
        deadline=task.deadline,
        priority=task.priority,
        photo_required=task.photo_required,
        before_after_photos=task.before_after_photos,
        max_photos=task.max_photos,
        created_by=user.user_id,
        store_code=task.store_code,
        store_name=task.store_name,
        city=task.city,
        state=task.state,
        checklist_date=task.checklist_date
    )
    db.add(new_task)
    db.commit()
    
    return {"task_id": task_id, "store_id": task.store_id, "supervisor_id": task.supervisor_id, "title": task.title}

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str, request: Request, db: Session = Depends(get_db)):
    await require_auth(request, db)
    
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    store = db.query(Store).filter(Store.store_id == task.store_id).first()
    
    default_tasks = [
        "Is the general attendance of technician satisfactory",
        "Is the CM / PM done as per schedule",
        "Are PPEs & Uniform available with Technician",
        "Are Tools available with Technician",
        "Is Thermography of Equipments of store done as per schedule",
        "Are all abnormalities recorded of thermography resolved",
        "Are the service records (FSR) available in store",
        "Are the FM corner all documents available in store",
        "Are the PM calendar activity done in store",
        "Are Lux level of lighting maintained as per business requirement",
        "Are Reflectors of light fixtures clean & properly fixed",
        "Are Work permits available/maintained in the store",
        "Is power factor of store maintained at unity",
        "Are all sensors working properly",
        "Are BOH lights switched off when not necessary",
        "Are temperature settings proper",
        "Is Energy Meter log book maintained at store"
    ]
    
    return {
        "task_id": task.task_id,
        "store_id": task.store_id,
        "supervisor_id": task.supervisor_id,
        "title": task.title,
        "description": task.description,
        "deadline": task.deadline,
        "priority": task.priority,
        "photo_required": task.photo_required,
        "before_after_photos": task.before_after_photos,
        "max_photos": task.max_photos,
        "created_at": task.created_at,
        "store_code": task.store_code,
        "store_name": task.store_name,
        "city": task.city,
        "state": task.state,
        "checklist_items": default_tasks,
        "store_info": {
            "store_id": store.store_id,
            "name": store.name,
            "mall_name": store.mall_name,
            "location": {"lat": store.latitude, "lng": store.longitude},
            "radius": store.radius
        } if store else None
    }

# ==================== SUBMISSIONS ROUTES ====================

@app.post("/api/submissions")
async def create_submission(submission: SubmissionCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    new_submission = TaskSubmission(
        submission_id=submission_id,
        task_id=submission.task_id,
        supervisor_id=user.user_id,
        photos=",".join(submission.photos),
        before_photos=",".join(submission.before_photos),
        remarks=submission.remarks,
        latitude=submission.latitude,
        longitude=submission.longitude,
        location_address=submission.location_address,
        status="submitted"
    )
    db.add(new_submission)
    db.commit()
    
    return {"submission_id": submission_id, "status": "submitted"}

# ==================== STORES ROUTES ====================

@app.get("/api/stores")
async def get_stores(request: Request, db: Session = Depends(get_db)):
    await require_auth(request, db)
    stores = db.query(Store).all()
    return [{
        "store_id": s.store_id, "name": s.name, "mall_name": s.mall_name,
        "latitude": s.latitude, "longitude": s.longitude, "radius": s.radius,
        "store_code": s.store_code
    } for s in stores]

@app.post("/api/stores")
async def create_store(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    return {"message": "Store creation not fully implemented for Vercel"}

# ==================== SUPERVISORS ROUTES ====================

@app.get("/api/supervisors")
async def get_supervisors(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    supervisors = db.query(User).filter(User.role == "supervisor").all()
    return [{"user_id": s.user_id, "email": s.email, "name": s.name, "picture": s.picture, "mall_name": s.mall_name} for s in supervisors]

@app.post("/api/supervisors")
async def create_supervisor(supervisor: SupervisorCreate, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    existing = db.query(User).filter(User.email == supervisor.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"sup_{uuid.uuid4().hex[:12]}"
    new_supervisor = User(
        user_id=user_id,
        email=supervisor.email,
        name=supervisor.name,
        picture=f"https://api.dicebear.com/7.x/initials/svg?seed={supervisor.name}",
        role="supervisor",
        password_hash=supervisor.password,
        mall_name=""
    )
    db.add(new_supervisor)
    db.commit()
    
    return {"user_id": user_id, "email": supervisor.email, "name": supervisor.name, "message": "Supervisor created successfully"}

# ==================== MAIN APP ====================

app.include_router(api_router)

# For Vercel serverless function
handler = app
