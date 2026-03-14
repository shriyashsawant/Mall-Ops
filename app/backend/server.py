from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import resend
import sendgrid
import json
import random
import string
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, TemplateId, Personalization
from sendgrid.helpers.mail import Email, To, Content

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    LlmChat = None
    UserMessage = None
    ImageContent = None
import os
import logging
from pathlib import Path
import enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ==================== DATABASE SETUP ====================

# Use DATABASE_URL if provided (Supabase), otherwise build from individual vars
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    DATABASE_URL = f"postgresql://{os.environ.get('POSTGRES_USER')}:{os.environ.get('POSTGRES_PASSWORD')}@{os.environ.get('POSTGRES_HOST')}:{os.environ.get('POSTGRES_PORT')}/{os.environ.get('POSTGRES_DB')}"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configure Resend (legacy)
resend.api_key = os.environ.get('RESEND_API_KEY', '')

# Configure SendGrid
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'shriyashsantoshsawant@gmail.com')
SENDGRID_TEMPLATE_ID = os.environ.get('SENDGRID_TEMPLATE_ID', 'd-fa61db22253b4efdbd16ddd2a30c3f7c')

# ==================== MODELS ====================

class UserRole(enum.Enum):
    manager = "manager"
    supervisor = "supervisor"

class TaskPriority(enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

class SubmissionStatus(enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    picture = Column(String)
    role = Column(String, default="supervisor")
    mall_name = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"))
    session_token = Column(String, unique=True)
    mall_name = Column(String, default="")
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(String, primary_key=True)
    mall_id = Column(String, ForeignKey("malls.mall_id"))
    name = Column(String, nullable=False)
    store_code = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius = Column(Integer, default=100)
    created_by = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    mall = relationship("Mall", back_populates="stores")
    tasks = relationship("Task", back_populates="store")
    assignments = relationship("SupervisorAssignment", back_populates="store")

class Mall(Base):
    __tablename__ = "malls"
    
    mall_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    city = Column(String, default="Pune")
    state = Column(String, default="Maharashtra")
    address = Column(String, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_by = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    stores = relationship("Store", back_populates="mall")

class Task(Base):
    __tablename__ = "tasks"
    
    task_id = Column(String, primary_key=True)
    store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    supervisor_id = Column(String, ForeignKey("users.user_id"), nullable=True)
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
    submissions = relationship("TaskSubmission", back_populates="task")

class TaskSubmission(Base):
    __tablename__ = "submissions"
    
    submission_id = Column(String, primary_key=True)
    task_id = Column(String, ForeignKey("tasks.task_id"))
    supervisor_id = Column(String, ForeignKey("users.user_id"))
    photos = Column(Text)  # JSON string of base64 images
    before_photos = Column(Text)  # JSON string
    remarks = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    location_address = Column(String)
    status = Column(String, default="pending")
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime)
    reviewed_by = Column(String)
    manager_remarks = Column(Text)
    ai_photo_analysis = Column(Text)
    completion_time = Column(DateTime)
    
    task = relationship("Task", back_populates="submissions")

class TaskTemplate(Base):
    __tablename__ = "task_templates"
    
    template_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    title = Column(String)
    description = Column(Text)
    priority = Column(String, default="medium")
    photo_required = Column(Boolean, default=True)
    before_after_photos = Column(Boolean, default=False)
    max_photos = Column(Integer, default=5)
    recurring = Column(Boolean, default=False)
    recurrence_type = Column(String)
    recurrence_time = Column(String)
    created_by = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SupervisorAssignment(Base):
    __tablename__ = "supervisor_assignments"
    
    assignment_id = Column(String, primary_key=True)
    supervisor_id = Column(String, ForeignKey("users.user_id"))
    store_id = Column(String, ForeignKey("stores.store_id"))
    assigned_by = Column(String)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    
    store = relationship("Store", back_populates="assignments")

class Notification(Base):
    __tablename__ = "notifications"
    
    notification_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.user_id"))
    title = Column(String, nullable=False)
    message = Column(Text)
    type = Column(String, default="info")
    task_id = Column(String)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"
    
    report_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    schedule = Column(String)
    day_of_week = Column(Integer)
    time = Column(String)
    recipients = Column(Text)  # JSON string
    enabled = Column(Boolean, default=True)
    last_sent = Column(DateTime)
    created_by = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PushToken(Base):
    __tablename__ = "push_tokens"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"), unique=True)
    token = Column(Text)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class InventoryRequest(Base):
    __tablename__ = "inventory_requests"
    
    request_id = Column(String, primary_key=True)
    task_id = Column(String, ForeignKey("tasks.task_id"))
    store_id = Column(String, ForeignKey("stores.store_id"))
    supervisor_id = Column(String, ForeignKey("users.user_id"))
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    urgency = Column(String, default="medium")
    notes = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fulfilled_at = Column(DateTime)

from sqlalchemy import text

# Seed initial data
def seed_data():
    db = SessionLocal()
    try:
        # Check if manager already exists
        existing_manager = db.query(User).filter(User.email == "Maruti.Patil@clrservices.com").first()
        if not existing_manager:
            manager = User(
                user_id="1",
                email="Maruti.Patil@clrservices.com",
                name="Maruti Patil",
                role="manager",
                mall_name=""
            )
            db.add(manager)
            db.commit()
            logger.info("Created manager user: Maruti Patil")
        
        # Pre-defined store names (for dropdown)
        store_names = [
            "Reliance Trends",
            "Reliance Digital",
            "Smart Bazaar",
            "Mall Management",
            "Smart Point",
            "Reliance FootPrint",
            "Reliance Fresh"
        ]
        
        # Pre-defined task templates
        task_templates = [
            {"activity": "Is the general attendance of technician satisfactory"},
            {"activity": "Is the CM / PM done as per schedule"},
            {"activity": "Are PPEs & Uniform available with Technician"},
            {"activity": "Are Tools available with Technician"},
            {"activity": "Is Thermography of Equipments of store done as per schedule"},
            {"activity": "Are all abnormalities recorded of thermography resolved"},
            {"activity": "Are the service records (FSR) available in store"},
            {"activity": "Are the FM corner all documents available in store"},
            {"activity": "Are the PM calendar activity done in store"},
            {"activity": "Are Lux level of lighting maintained as per business requirement"},
            {"activity": "Are Reflectors of light fixtures clean & properly fixed"},
            {"activity": "Are Work permits available/maintained in the store"},
            {"activity": "Is power factor of store maintained at unity"},
            {"activity": "Are all sensors working properly e.g. Door sensors, AC controllers, Motion Sensors etc"},
            {"activity": "Are BOH lights switched off when not necessary"},
            {"activity": "Are temperature settings of all Open chiller (3 deg C to 8 deg C), freezers (-18 deg C) and AC (24 Deg C) set properly"},
            {"activity": "Is Energy Meter log book maintained at store"},
        ]
        
        # Create task templates
        for idx, t in enumerate(task_templates, 1):
            existing = db.query(TaskTemplate).filter(TaskTemplate.title == t["activity"]).first()
            if not existing:
                template = TaskTemplate(
                    template_id=f"template_{idx}",
                    name=t["activity"][:50],  # First 50 chars as name
                    title=t["activity"],
                    description=f"Daily checklist: {t['activity']}",
                    priority="high",
                    photo_required=True,
                    created_by="1"
                )
                db.add(template)
        
        db.commit()
        logger.info(f"Created {len(task_templates)} task templates")
    except Exception as e:
        logger.error(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()

def initialize_db():
    logger.info("Initializing database...")
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Add new columns if they don't exist
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS mall_name VARCHAR DEFAULT ''"))
            conn.execute(text("ALTER TABLE stores ADD COLUMN IF NOT EXISTS mall_name VARCHAR DEFAULT ''"))
            conn.execute(text("ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_code INTEGER"))
            conn.execute(text("ALTER TABLE stores ADD COLUMN IF NOT EXISTS mall_id VARCHAR"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS store_code INTEGER"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS store_name VARCHAR"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS city VARCHAR DEFAULT 'Pune'"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS state VARCHAR DEFAULT 'ROOM 1 (Rest of Maharastra - 1)'"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist_date VARCHAR"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR"))
            
            # Create malls table if not exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS malls (
                    mall_id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    city VARCHAR DEFAULT 'Pune',
                    state VARCHAR DEFAULT 'Maharashtra',
                    address VARCHAR DEFAULT '',
                    latitude FLOAT,
                    longitude FLOAT,
                    created_by VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS title VARCHAR"))
            conn.execute(text("ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS mall_name VARCHAR DEFAULT ''"))
            conn.commit()
        
        # Seed initial data
        seed_data()
        logger.info("Database initialization complete.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

# ==================== Pydantic Models ====================

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "supervisor"

class StoreCreate(BaseModel):
    name: str
    mall_id: str
    store_code: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: int = 100

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

class SubmissionReview(BaseModel):
    status: str
    manager_remarks: Optional[str] = None

class TaskTemplateCreate(BaseModel):
    name: str
    title: Optional[str] = None
    description: str
    priority: str = "medium"
    photo_required: bool = True
    before_after_photos: bool = False
    max_photos: int = 5
    recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_time: Optional[str] = None
    tasks: List[str] = []  # Store custom tasks as list

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"
    task_id: Optional[str] = None

class ScheduledReportCreate(BaseModel):
    name: str
    schedule: str
    day_of_week: Optional[int] = None
    time: str
    recipients: List[str]
    enabled: bool = True

class SessionRequest(BaseModel):
    session_id: str
    role: str = "supervisor"
    mall_name: str = ""

class PhotoAnalysisRequest(BaseModel):
    image_base64: str
    task_description: str

class PushTokenRequest(BaseModel):
    token: str

class InventoryRequestCreate(BaseModel):
    task_id: Optional[str] = None
    store_id: str
    item_name: str
    quantity: int = 1
    urgency: str = "medium"
    notes: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    if db is None:
        return None
    
    session_doc = db.query(UserSession).filter(UserSession.session_token == session_token).first()
    if not session_doc:
        return None
    
    if session_doc.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    
    user = db.query(User).filter(User.user_id == session_doc.user_id).first()
    return user

async def require_auth(request: Request, db: Session):
    user = await get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_manager(request: Request, db: Session):
    user = await require_auth(request, db)
    if user.role != "manager":
        raise HTTPException(status_code=403, detail="Manager role required")
    return user

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371000  # meters
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

def send_assignment_email(supervisor_email: str, supervisor_name: str, manager_name: str, 
                           task_title: str, store_name: str, deadline: str, task_id: str) -> bool:
    """Send email notification to supervisor about new checklist assignment"""
    try:
        # Try SendGrid first, fallback to Resend
        if SENDGRID_API_KEY and SENDGRID_API_KEY.startswith('SG.'):
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
            task_link = f"{frontend_url}/supervisor/tasks/{task_id}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                    .detail-row {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #555; }}
                    .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; margin-top: 20px; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">New Checklist Assigned</h1>
                    </div>
                    <div class="content">
                        <p>Hello <strong>{supervisor_name}</strong>,</p>
                        <p>A new checklist has been assigned to you by <strong>{manager_name}</strong>.</p>
                        
                        <div class="details">
                            <div class="detail-row">
                                <span class="label">Checklist:</span> {task_title}
                            </div>
                            <div class="detail-row">
                                <span class="label">Store:</span> {store_name}
                            </div>
                            <div class="detail-row">
                                <span class="label">Due Date:</span> {deadline}
                            </div>
                        </div>
                        
                        <a href="{task_link}" class="button">View Checklist</a>
                        
                        <p style="margin-top: 20px;">Please complete this checklist before the due date.</p>
                    </div>
                    <div class="footer">
                        <p>Mall Operations Management System</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            message = Mail(
                from_email=SENDGRID_FROM_EMAIL,
                to_emails=supervisor_email,
                subject=f"New Checklist Assigned: {task_title} - Due {deadline}",
                html_content=html_content
            )
            sg.send(message)
            logger.info(f"Assignment email sent to {supervisor_email} via SendGrid for task {task_id}")
            return True
        
        # Fallback to Resend
        resend.api_key = os.environ.get('RESEND_API_KEY', '')
        sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
        
        if not resend.api_key or resend.api_key == 'your_resend_api_key_here':
            logger.warning("Resend API key not configured, skipping email")
            return False
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        task_link = f"{frontend_url}/supervisor/tasks/{task_id}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .detail-row {{ margin: 10px 0; }}
                .label {{ font-weight: bold; color: #555; }}
                .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 20px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">New Checklist Assigned</h1>
                </div>
                <div class="content">
                    <p>Hello <strong>{supervisor_name}</strong>,</p>
                    <p>A new checklist has been assigned to you by <strong>{manager_name}</strong>.</p>
                    
                    <div class="details">
                        <div class="detail-row">
                            <span class="label">Checklist:</span> {task_title}
                        </div>
                        <div class="detail-row">
                            <span class="label">Store:</span> {store_name}
                        </div>
                        <div class="detail-row">
                            <span class="label">Due Date:</span> {deadline}
                        </div>
                    </div>
                    
                    <a href="{task_link}" class="button">View Checklist</a>
                    
                    <p style="margin-top: 20px;">Please complete this checklist before the due date.</p>
                </div>
                <div class="footer">
                    <p>Mall Operations Management System</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": f"Mall Ops <{sender_email}>",
            "to": supervisor_email,
            "subject": f"New Checklist Assigned: {task_title} - Due {deadline}",
            "html": html_content
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Assignment email sent to {supervisor_email} for task {task_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send assignment email: {str(e)}")
        return False


def send_supervisor_welcome_email(supervisor_email: str, supervisor_name: str, password: str, manager_name: str) -> bool:
    """Send welcome email to newly created supervisor with login credentials"""
    try:
        resend.api_key = os.environ.get('RESEND_API_KEY', '')
        sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
        
        if not resend.api_key or resend.api_key == 'your_resend_api_key_here':
            logger.warning("Resend API key not configured, skipping email")
            return False
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        login_link = f"{frontend_url}/login"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Mall Ops</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Mall Operations</h1>
                                    <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Management System</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Welcome, {supervisor_name}! 🎉</h2>
                                    
                                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        <strong>{manager_name}</strong> has added you to the Mall Operations Management System as a Supervisor.
                                    </p>
                                    
                                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                        Your login credentials are provided below. Please login and change your password after first login.
                                    </p>
                                    
                                    <!-- Credentials Box -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border: 1px solid #e9ecef;">
                                        <tr>
                                            <td style="padding: 10px 0;">
                                                <p style="color: #495057; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">Email Address</p>
                                                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 500;">{supervisor_email}</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px 0; border-top: 1px solid #dee2e6;">
                                                <p style="color: #495057; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">Temporary Password</p>
                                                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 500; font-family: monospace; background: #fff; padding: 8px 12px; border-radius: 4px; display: inline-block;">{password}</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- CTA Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center" style="padding: 30px 0;">
                                                <a href="{login_link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                                    Login to Dashboard
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                        After logging in, you'll be able to:
                                    </p>
                                    <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 10px 0 0 0; padding-left: 20px;">
                                        <li>View and complete assigned checklists</li>
                                        <li>Submit photos and reports from store locations</li>
                                        <li>Track your task submissions</li>
                                    </ul>
                                    
                                    <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 40px 0 0 0; border-top: 1px solid #e9ecef; padding-top: 20px;">
                                        This is an automated message from Mall Operations Management System. Please do not reply to this email.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="color: #999999; font-size: 12px; margin: 0;">© 2024 Mall Operations Management System. All rights reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        params = {
            "from": f"Mall Ops <{sender_email}>",
            "to": supervisor_email,
            "subject": f"Welcome to Mall Operations - Your Login Credentials",
            "html": html_content
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Welcome email sent to {supervisor_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome email: {str(e)}")
        return False

# ==================== APP SETUP ====================

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    initialize_db()
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Try a simple query
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "error", "message": str(e)}

@app.get("/")
async def root():
    return {"message": "Mall-Ops Backend is running", "guide": "/api/store-names"}

api_router = APIRouter(prefix="/api")

# ==================== AUTH ROUTES ====================

@api_router.get("/auth/login-redirect")
async def login_redirect():
    return {"auth_url": "https://auth.emergentagent.com/"}

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str = "supervisor"

class SupervisorCreate(BaseModel):
    email: str
    name: str
    password: Optional[str] = None

@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # Special password for demo
    MANAGER_PASSWORD = "Maruti@123"
    
    # Check password for manager email
    if request.email == "Maruti.Patil@clrservices.com" and request.password != MANAGER_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            user_id=user_id,
            email=request.email,
            name=request.email.split('@')[0],
            role=request.role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    user.role = request.role
    if request.email == "Maruti.Patil@clrservices.com":
        user.role = "manager"
    db.commit()
    
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user.user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7*24*60*60,
        path="/"
    )
    
    return {"user": {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture, "role": user.role, "mall_name": user.mall_name}, "session_token": session_token}

@api_router.post("/auth/session")
async def create_session(request: SessionRequest, response: Response, db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            auth_response.raise_for_status()
            session_data = auth_response.json()
        
        user = db.query(User).filter(User.email == session_data["email"]).first()
        
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = User(
                user_id=user_id,
                email=session_data["email"],
                name=session_data.get("name", "User"),
                picture=session_data.get("picture"),
                role=request.role,
                mall_name=request.mall_name
            )
            db.add(user)
        else:
            user.name = session_data.get("name", user.name)
            user.picture = session_data.get("picture", user.picture)
            user.role = request.role
            user.mall_name = request.mall_name
        
        db.commit()
        
        session_token = session_data.get("session_token") or f"sess_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = UserSession(
            user_id=user.user_id,
            session_token=session_token,
            mall_name=request.mall_name,
            expires_at=expires_at
        )
        db.add(session)
        db.commit()
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7*24*60*60,
            path="/"
        )
        
        return {"user": {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture, "role": user.role, "mall_name": user.mall_name}, "session_token": session_token}
    
    except Exception as e:
        logger.error(f"Session creation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me")
async def get_me(request: Request, db: Session = Depends(get_db)):
    user = await get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user_id": user.user_id, "email": user.email, "name": user.name, "picture": user.picture, "role": user.role, "mall_name": user.mall_name}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    session_token = request.cookies.get("session_token")
    if session_token:
        db.query(UserSession).filter(UserSession.session_token == session_token).delete()
        db.commit()
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== STORE ROUTES ====================

from fastapi import Depends

class MallCreate(BaseModel):
    name: str
    city: str = "Pune"
    state: str = "Maharashtra"
    address: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MallResponse(BaseModel):
    mall_id: str
    name: str
    city: str
    state: str
    address: Optional[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    store_count: int = 0

@api_router.get("/malls", response_model=List[MallResponse])
async def get_malls(request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    logger.info(f"User {user.email} fetching malls")
    
    malls = db.query(Mall).all()
    logger.info(f"Found {len(malls)} malls")
    result = []
    for m in malls:
        store_count = db.query(Store).filter(Store.mall_id == m.mall_id).count()
        result.append({
            "mall_id": m.mall_id,
            "name": m.name,
            "city": m.city,
            "state": m.state,
            "address": m.address,
            "latitude": m.latitude,
            "longitude": m.longitude,
            "store_count": store_count
        })
    return result

@api_router.post("/malls")
async def create_mall(mall: MallCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    existing = db.query(Mall).filter(Mall.name == mall.name, Mall.city == mall.city).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mall already exists in this city")
    
    mall_id = f"mall_{uuid.uuid4().hex[:12]}"
    new_mall = Mall(
        mall_id=mall_id,
        name=mall.name,
        city=mall.city,
        state=mall.state,
        address=mall.address or "",
        latitude=mall.latitude,
        longitude=mall.longitude,
        created_by=user.user_id
    )
    db.add(new_mall)
    db.commit()
    
    return {"mall_id": mall_id, "name": mall.name, "city": mall.city, "latitude": mall.latitude, "longitude": mall.longitude, "message": "Mall created successfully. Now add stores to this mall."}

@api_router.delete("/malls/{mall_id}")
async def delete_mall(mall_id: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    mall = db.query(Mall).filter(Mall.mall_id == mall_id).first()
    if not mall:
        raise HTTPException(status_code=404, detail="Mall not found")
    
    # Check if stores exist
    store_count = db.query(Store).filter(Store.mall_id == mall_id).count()
    if store_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete mall with {store_count} stores. Remove stores first.")
    
    db.delete(mall)
    db.commit()
    
    return {"message": "Mall deleted successfully"}

@api_router.get("/stores")
async def get_stores(request: Request, mall_id: str = None, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    query = db.query(Store)
    if mall_id:
        query = query.filter(Store.mall_id == mall_id)
    elif user.role != "manager":
        user_mall = db.query(Mall).filter(Mall.name == user.mall_name).first()
        if user_mall:
            query = query.filter(Store.mall_id == user_mall.mall_id)
    
    stores = query.all()
    
    result = []
    for s in stores:
        mall = db.query(Mall).filter(Mall.mall_id == s.mall_id).first() if s.mall_id else None
        # Use store location if available, otherwise use mall location
        lat = s.latitude if s.latitude else (mall.latitude if mall else None)
        lng = s.longitude if s.longitude else (mall.longitude if mall else None)
        result.append({
            "store_id": s.store_id, 
            "name": s.name, 
            "mall_id": s.mall_id,
            "mall_name": mall.name if mall else "",
            "store_code": s.store_code, 
            "location": {"lat": lat, "lng": lng}, 
            "mall_location": {"lat": mall.latitude, "lng": mall.longitude} if mall and mall.latitude else None,
            "radius": s.radius, 
            "created_at": s.created_at
        })
    return result

@api_router.post("/stores")
async def create_store(store: StoreCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    # Verify mall exists
    mall = db.query(Mall).filter(Mall.mall_id == store.mall_id).first()
    if not mall:
        raise HTTPException(status_code=404, detail="Mall not found")
    
    store_id = f"store_{uuid.uuid4().hex[:12]}"
    new_store = Store(
        store_id=store_id,
        mall_id=store.mall_id,
        name=store.name,
        store_code=store.store_code,
        latitude=store.latitude,
        longitude=store.longitude,
        radius=store.radius,
        created_by=user.user_id
    )
    db.add(new_store)
    db.commit()
    
    return {"store_id": store_id, "name": store.name, "mall_id": store.mall_id, "mall_name": mall.name, "store_code": store.store_code, "location": {"lat": store.latitude, "lng": store.longitude}, "radius": store.radius}

@api_router.delete("/stores/{store_id}")
async def delete_store(store_id: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    db.delete(store)
    db.commit()
    return {"message": "Store deleted successfully"}

# ==================== TASK ROUTES ====================

@api_router.get("/tasks")
async def get_tasks(request: Request, store_id: Optional[str] = None, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    query = db.query(Task)
    
    # If supervisor, only show tasks assigned to them
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

@api_router.post("/tasks")
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
    
    # Send email notification to supervisor if assigned
    email_sent = False
    if task.supervisor_id:
        supervisor = db.query(User).filter(User.user_id == task.supervisor_id).first()
        if supervisor and supervisor.email:
            deadline_str = task.deadline.strftime('%d %B %Y, %I:%M %p') if hasattr(task.deadline, 'strftime') else str(task.deadline)
            email_sent = send_assignment_email(
                supervisor_email=supervisor.email,
                supervisor_name=supervisor.name or supervisor.email.split('@')[0],
                manager_name=user.name or user.email.split('@')[0],
                task_title=task.title,
                store_name=task.store_name or task.store_id or 'N/A',
                deadline=deadline_str,
                task_id=task_id
            )
    
    return {"task_id": task_id, "store_id": task.store_id, "supervisor_id": task.supervisor_id, "title": task.title, "description": task.description,
            "deadline": task.deadline, "priority": task.priority, "photo_required": task.photo_required,
            "before_after_photos": task.before_after_photos, "max_photos": task.max_photos,
            "store_code": task.store_code, "store_name": task.store_name, "city": task.city, "state": task.state,
            "email_sent": email_sent}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str, request: Request, db: Session = Depends(get_db)):
    await require_auth(request, db)
    
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    store = db.query(Store).filter(Store.store_id == task.store_id).first()
    mall = db.query(Mall).filter(Mall.mall_id == store.mall_id).first() if store and store.mall_id else None
    
    store_lat = store.latitude if store and store.latitude else (mall.latitude if mall and mall.latitude else None)
    store_lng = store.longitude if store and store.longitude else (mall.longitude if mall and mall.longitude else None)
    
    # Get default checklist items
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
        "checklist_date": task.checklist_date,
        "checklist_items": default_tasks,
        "store_info": {
            "store_id": store.store_id,
            "name": store.name,
            "mall_name": mall.name if mall else "",
            "location": {"lat": store_lat, "lng": store_lng},
            "radius": store.radius if store else 100
        } if store else None
    }

@api_router.get("/supervisor/assigned-stores")
async def get_supervisor_stores(request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    if user.role == "manager":
        return []
    
    assignments = db.query(SupervisorAssignment).filter(
        SupervisorAssignment.supervisor_id == user.user_id,
        SupervisorAssignment.is_active == True
    ).all()
    
    result = []
    for a in assignments:
        store = db.query(Store).filter(Store.store_id == a.store_id).first()
        if store:
            mall = db.query(Mall).filter(Mall.mall_id == store.mall_id).first() if store.mall_id else None
            store_lat = store.latitude if store.latitude else (mall.latitude if mall and mall.latitude else None)
            store_lng = store.longitude if store.longitude else (mall.longitude if mall and mall.longitude else None)
            result.append({
                "store_id": store.store_id,
                "name": store.name,
                "mall_id": store.mall_id,
                "mall_name": mall.name if mall else "",
                "store_code": store.store_code,
                "location": {"lat": store_lat, "lng": store_lng},
                "radius": store.radius
            })
    
    return result

# ==================== TEMPLATE ROUTES ====================

@api_router.get("/templates")
async def get_templates(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    import json
    
    DEFAULT_TASKS = [
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
    
    templates = db.query(TaskTemplate).all()
    result = []
    for t in templates:
        # Try to parse tasks from description
        tasks = DEFAULT_TASKS  # Default tasks
        try:
            if t.description and t.description.startswith('{'):
                data = json.loads(t.description)
                if 'tasks' in data and data['tasks']:
                    tasks = data['tasks']
        except:
            pass
        result.append({"template_id": t.template_id, "name": t.name, "title": t.title, "description": t.description, "priority": t.priority,
             "photo_required": t.photo_required, "before_after_photos": t.before_after_photos, "max_photos": t.max_photos,
             "recurring": t.recurring, "recurrence_type": t.recurrence_type, "recurrence_time": t.recurrence_time,
             "tasks": tasks})
    return result

@api_router.post("/templates")
async def create_template(template: TaskTemplateCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    # Store custom tasks in description as JSON if provided
    import json
    description = template.description
    if template.tasks and len(template.tasks) > 0:
        description = json.dumps({"tasks": template.tasks, "note": template.description})
    
    template_id = f"tpl_{uuid.uuid4().hex[:12]}"
    new_template = TaskTemplate(
        template_id=template_id,
        name=template.name,
        title=template.title or template.name,
        description=description,
        priority=template.priority,
        photo_required=template.photo_required,
        before_after_photos=template.before_after_photos,
        max_photos=template.max_photos,
        recurring=template.recurring,
        recurrence_type=template.recurrence_type,
        recurrence_time=template.recurrence_time,
        created_by=user.user_id
    )
    db.add(new_template)
    db.commit()
    
    return {"template_id": template_id, "name": template.name, "title": template.title or template.name, "tasks": template.tasks}

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    template = db.query(TaskTemplate).filter(TaskTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}

# ==================== SUPERVISOR ROUTES ====================

@api_router.get("/supervisors")
async def get_supervisors(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    supervisors = db.query(User).filter(User.role == "supervisor").all()
    return [{"user_id": s.user_id, "email": s.email, "name": s.name, "picture": s.picture, "mall_name": s.mall_name} for s in supervisors]

@api_router.post("/supervisors")
async def create_supervisor(supervisor: SupervisorCreate, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    existing = db.query(User).filter(User.email == supervisor.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate a random password if not provided
    import random
    import string
    if not supervisor.password:
        supervisor.password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    
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
    
    # Send welcome email to supervisor
    user = await require_auth(request, db)
    email_sent = send_supervisor_welcome_email(
        supervisor_email=supervisor.email,
        supervisor_name=supervisor.name,
        password=supervisor.password,
        manager_name=user.name or user.email.split('@')[0]
    )
    
    return {"user_id": user_id, "email": supervisor.email, "name": supervisor.name, "message": "Supervisor created successfully", "email_sent": email_sent}

@api_router.put("/supervisors/{user_id}/assign-mall")
async def assign_supervisor_to_mall(user_id: str, mall_name: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    supervisor = db.query(User).filter(User.user_id == user_id, User.role == "supervisor").first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found")
    
    supervisor.mall_name = mall_name
    db.commit()
    
    return {"user_id": supervisor.user_id, "email": supervisor.email, "name": supervisor.name, "mall_name": supervisor.mall_name}

# Pre-defined store names for dropdown
STORE_NAMES = [
    "Reliance Trends",
    "Reliance Digital",
    "Smart Bazaar",
    "Mall Management",
    "Smart Point",
    "Reliance FootPrint",
    "Reliance Fresh"
]

@api_router.get("/store-names")
async def get_store_names():
    return {"store_names": STORE_NAMES}

@api_router.get("/malls/list")
async def get_malls_list(db: Session = Depends(get_db)):
    malls = db.query(Mall).all()
    return {"malls": [m.name for m in malls]}

@api_router.get("/malls/hierarchical")
async def get_malls_hierarchical(db: Session = Depends(get_db)):
    """
    Get all malls with their stores in a hierarchical format.
    This is used for dropdown selection in task creation.
    """
    malls = db.query(Mall).all()
    
    result = []
    for mall in malls:
        stores = db.query(Store).filter(Store.mall_id == mall.mall_id).all()
        store_list = []
        for store in stores:
            store_list.append({
                "store_id": store.store_id,
                "name": store.name,
                "store_code": store.store_code,
                "location": {
                    "lat": store.latitude if store.latitude else mall.latitude,
                    "lng": store.longitude if store.longitude else mall.longitude
                },
                "radius": store.radius
            })
        
        result.append({
            "mall_id": mall.mall_id,
            "name": mall.name,
            "city": mall.city,
            "state": mall.state,
            "latitude": mall.latitude,
            "longitude": mall.longitude,
            "stores": store_list
        })
    
    return {"malls": result}

@api_router.get("/assignments")
async def get_assignments(request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    if user.role == "manager":
        assignments = db.query(SupervisorAssignment).filter(SupervisorAssignment.is_active == True).all()
    else:
        assignments = db.query(SupervisorAssignment).filter(
            SupervisorAssignment.supervisor_id == user.user_id,
            SupervisorAssignment.is_active == True
        ).all()
    
    result = []
    for a in assignments:
        supervisor = db.query(User).filter(User.user_id == a.supervisor_id).first()
        store = db.query(Store).filter(Store.store_id == a.store_id).first()
        result.append({
            "assignment_id": a.assignment_id,
            "supervisor_id": a.supervisor_id,
            "store_id": a.store_id,
            "assigned_at": a.assigned_at,
            "supervisor_info": {"user_id": supervisor.user_id, "name": supervisor.name} if supervisor else None,
            "store_info": {"store_id": store.store_id, "name": store.name} if store else None
        })
    return result

@api_router.post("/assignments")
async def create_assignment(supervisor_id: str, store_id: str, request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    supervisor = db.query(User).filter(User.user_id == supervisor_id, User.role == "supervisor").first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found")
    
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    existing = db.query(SupervisorAssignment).filter(
        SupervisorAssignment.supervisor_id == supervisor_id,
        SupervisorAssignment.store_id == store_id,
        SupervisorAssignment.is_active == True
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    
    assignment_id = f"assn_{uuid.uuid4().hex[:12]}"
    assignment = SupervisorAssignment(
        assignment_id=assignment_id,
        supervisor_id=supervisor_id,
        store_id=store_id,
        assigned_by=user.user_id
    )
    db.add(assignment)
    db.commit()
    
    return {"assignment_id": assignment_id}

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    assignment = db.query(SupervisorAssignment).filter(SupervisorAssignment.assignment_id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.is_active = False
    db.commit()
    return {"message": "Assignment removed"}

# ==================== SUBMISSION ROUTES ====================

import json

@api_router.post("/submissions/start/{task_id}")
async def start_task(task_id: str, request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    existing = db.query(TaskSubmission).filter(
        TaskSubmission.task_id == task_id,
        TaskSubmission.supervisor_id == user.user_id
    ).first()
    
    if existing:
        existing.status = "in_progress"
        db.commit()
        return {"message": "Task started", "submission_id": existing.submission_id}
    
    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    submission = TaskSubmission(
        submission_id=submission_id,
        task_id=task_id,
        supervisor_id=user.user_id,
        status="in_progress"
    )
    db.add(submission)
    db.commit()
    
    return {"submission_id": submission_id}

@api_router.post("/submissions")
async def create_submission(submission: SubmissionCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    task = db.query(Task).filter(Task.task_id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.before_after_photos and (not submission.before_photos or len(submission.before_photos) == 0):
        raise HTTPException(status_code=400, detail="Before photos required for this task")
    
    if len(submission.photos) > task.max_photos:
        raise HTTPException(status_code=400, detail=f"Maximum {task.max_photos} photos allowed")
    
    store = db.query(Store).filter(Store.store_id == task.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Get location - use store location if available, otherwise use mall location
    store_lat = store.latitude
    store_lng = store.longitude
    if not store_lat or not store_lng:
        # Get mall location
        mall = db.query(Mall).filter(Mall.mall_id == store.mall_id).first() if store.mall_id else None
        if mall and mall.latitude and mall.longitude:
            store_lat = mall.latitude
            store_lng = mall.longitude
        else:
            raise HTTPException(status_code=400, detail="Store location not set. Please contact manager.")
    
    distance = haversine_distance(submission.latitude, submission.longitude, store_lat, store_lng)
    if distance > store.radius:
        raise HTTPException(status_code=403, detail=f"You must be within {store.radius}m of the store. Current distance: {int(distance)}m")
    
    existing = db.query(TaskSubmission).filter(
        TaskSubmission.task_id == submission.task_id,
        TaskSubmission.supervisor_id == user.user_id
    ).first()
    
    all_photos = submission.photos + submission.before_photos
    ai_analysis = None
    if all_photos and LLM_AVAILABLE:
        try:
            chat = LlmChat(
                api_key=os.environ.get('EMERGENT_LLM_KEY'),
                session_id=f"analysis_{uuid.uuid4().hex[:8]}",
                system_message="You are a quality inspector."
            ).with_model("gemini", "gemini-3-flash-preview")
            
            image_content = ImageContent(image_base64=all_photos[0])
            response = await chat.send_message(UserMessage(
                text=f"Task: {task.title}. Description: {task.description}. Analyze this photo.",
                file_contents=[image_content]
            ))
            ai_analysis = response
        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")
            ai_analysis = "Analysis unavailable"
    
    if existing:
        existing.photos = json.dumps(submission.photos)
        existing.before_photos = json.dumps(submission.before_photos)
        existing.remarks = submission.remarks
        existing.latitude = submission.latitude
        existing.longitude = submission.longitude
        existing.location_address = submission.location_address
        existing.status = "submitted"
        existing.submitted_at = datetime.now(timezone.utc)
        existing.ai_photo_analysis = ai_analysis
        existing.completion_time = datetime.now(timezone.utc)
        db.commit()
        return {"submission_id": existing.submission_id, "status": "submitted"}
    
    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    new_submission = TaskSubmission(
        submission_id=submission_id,
        task_id=submission.task_id,
        supervisor_id=user.user_id,
        photos=json.dumps(submission.photos),
        before_photos=json.dumps(submission.before_photos),
        remarks=submission.remarks,
        latitude=submission.latitude,
        longitude=submission.longitude,
        location_address=submission.location_address,
        status="submitted",
        ai_photo_analysis=ai_analysis,
        completion_time=datetime.now(timezone.utc)
    )
    db.add(new_submission)
    db.commit()
    
@api_router.get("/submissions")
async def get_submissions(request: Request, limit: int = 100, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    query = db.query(TaskSubmission)
    if user.role != "manager":
        query = query.filter(TaskSubmission.supervisor_id == user.user_id)
    
    submissions = query.order_by(TaskSubmission.submitted_at.desc()).limit(limit).all()
    
    result = []
    for s in submissions:
        task = db.query(Task).filter(Task.task_id == s.task_id).first()
        supervisor = db.query(User).filter(User.user_id == s.supervisor_id).first()
        result.append({
            "submission_id": s.submission_id, "task_id": s.task_id, "supervisor_id": s.supervisor_id,
            "photos": json.loads(s.photos) if s.photos else [],
            "before_photos": json.loads(s.before_photos) if s.before_photos else [],
            "remarks": s.remarks, "location": {"lat": s.latitude, "lng": s.longitude},
            "status": s.status, "submitted_at": s.submitted_at, "ai_photo_analysis": s.ai_photo_analysis,
            "task_info": {"task_id": task.task_id, "title": task.title, "description": task.description, "priority": task.priority} if task else None,
            "supervisor_info": {"user_id": supervisor.user_id, "name": supervisor.name} if supervisor else None
        })
    return result

@api_router.get("/submissions/pending")
async def get_pending_submissions(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    submissions = db.query(TaskSubmission).filter(
        TaskSubmission.status.in_(["pending", "in_progress", "submitted"])
    ).all()
    
    result = []
    for s in submissions:
        task = db.query(Task).filter(Task.task_id == s.task_id).first()
        supervisor = db.query(User).filter(User.user_id == s.supervisor_id).first()
        result.append({
            "submission_id": s.submission_id, "task_id": s.task_id, "supervisor_id": s.supervisor_id,
            "photos": json.loads(s.photos) if s.photos else [],
            "before_photos": json.loads(s.before_photos) if s.before_photos else [],
            "remarks": s.remarks, "location": {"lat": s.latitude, "lng": s.longitude},
            "status": s.status, "submitted_at": s.submitted_at, "ai_photo_analysis": s.ai_photo_analysis,
            "task_info": {"task_id": task.task_id, "title": task.title, "description": task.description, "priority": task.priority} if task else None,
            "supervisor_info": {"user_id": supervisor.user_id, "name": supervisor.name} if supervisor else None
        })
    return result

@api_router.put("/submissions/{submission_id}/review")
async def review_submission(submission_id: str, review: SubmissionReview, request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    submission = db.query(TaskSubmission).filter(TaskSubmission.submission_id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.status = review.status
    submission.manager_remarks = review.manager_remarks
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by = user.user_id
    db.commit()
    
    return {"message": "Submission reviewed successfully"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    total_stores = db.query(Store).count()
    total_tasks = db.query(Task).count()
    pending = db.query(TaskSubmission).filter(TaskSubmission.status.in_(["pending", "in_progress", "submitted"])).count()
    approved = db.query(TaskSubmission).filter(TaskSubmission.status == "approved").count()
    rejected = db.query(TaskSubmission).filter(TaskSubmission.status == "rejected").count()
    
    total_submissions = pending + approved + rejected
    completion_rate = round((approved / total_submissions * 100) if total_submissions > 0 else 0, 1)
    
    now = datetime.now(timezone.utc)
    overdue = db.query(Task).filter(Task.deadline < now).count()
    high_priority = db.query(Task).filter(Task.priority == "high", Task.deadline >= now).count()
    
    stores = db.query(Store).all()
    store_stats = []
    for store in stores:
        tasks = db.query(Task).filter(Task.store_id == store.store_id).all()
        task_ids = [t.task_id for t in tasks]
        completed = db.query(TaskSubmission).filter(TaskSubmission.task_id.in_(task_ids), TaskSubmission.status == "approved").count() if task_ids else 0
        pending_s = db.query(TaskSubmission).filter(TaskSubmission.task_id.in_(task_ids), TaskSubmission.status.in_(["pending", "in_progress", "submitted"])).count() if task_ids else 0
        total = completed + pending_s
        rate = round((completed / total * 100) if total > 0 else 0, 1)
        store_stats.append({"store_id": store.store_id, "store_name": store.name, "total_tasks": len(tasks), "completed": completed, "pending": pending_s, "completion_rate": rate})
    
    return {
        "total_stores": total_stores, "total_tasks": total_tasks, "pending_submissions": pending,
        "approved_submissions": approved, "rejected_submissions": rejected, "completion_rate": completion_rate,
        "overdue_tasks": overdue, "high_priority_pending": high_priority, "store_stats": store_stats
    }

# ==================== NOTIFICATION ROUTES ====================

@api_router.get("/notifications")
async def get_notifications(request: Request, unread_only: bool = False, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    query = db.query(Notification).filter(Notification.user_id == user.user_id)
    if unread_only:
        query = query.filter(Notification.read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(100).all()
    return [{"notification_id": n.notification_id, "user_id": n.user_id, "title": n.title, "message": n.message,
             "type": n.type, "task_id": n.task_id, "read": n.read, "created_at": n.created_at} for n in notifications]

@api_router.post("/notifications")
async def create_notification(notification: NotificationCreate, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    new_notif = Notification(
        notification_id=notification_id,
        user_id=notification.user_id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        task_id=notification.task_id
    )
    db.add(new_notif)
    db.commit()
    return {"notification_id": notification_id}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    notif = db.query(Notification).filter(Notification.notification_id == notification_id, Notification.user_id == user.user_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    db.query(Notification).filter(Notification.user_id == user.user_id, Notification.read == False).update({"read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    count = db.query(Notification).filter(Notification.user_id == user.user_id, Notification.read == False).count()
    return {"unread_count": count}

# ==================== ESCALATION ====================

@api_router.post("/escalation/check")
async def check_escalation(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    now = datetime.now(timezone.utc)
    overdue_high = db.query(Task).filter(Task.priority == "high", Task.deadline < now).all()
    
    escalated = []
    for task in overdue_high:
        recent = db.query(Notification).filter(
            Notification.task_id == task.task_id,
            Notification.type == "escalation",
            Notification.created_at >= now - timedelta(hours=1)
        ).first()
        
        if not recent:
            managers = db.query(User).filter(User.role == "manager").all()
            for manager in managers:
                notif = Notification(
                    notification_id=f"notif_{uuid.uuid4().hex[:12]}",
                    user_id=manager.user_id,
                    title=f"Overdue: {task.title}",
                    message=f"High priority task is overdue. Deadline was {task.deadline}",
                    type="escalation",
                    task_id=task.task_id
                )
                db.add(notif)
            escalated.append(task.task_id)
    
    db.commit()
    return {"escalated_count": len(escalated), "tasks_escalated": escalated}

# ==================== AI ROUTES ====================

@api_router.post("/ai/analyze-photo")
async def analyze_photo(request_data: PhotoAnalysisRequest, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    if not LLM_AVAILABLE:
        return {"analysis": "AI analysis not available - emergentintegrations not installed"}
    
    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"photo_{uuid.uuid4().hex[:8]}",
            system_message="You are a quality inspector."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        image_content = ImageContent(image_base64=request_data.image_base64)
        response = await chat.send_message(UserMessage(
            text=f"Analyze: {request_data.task_description}",
            file_contents=[image_content]
        ))
        return {"analysis": response}
    except Exception as e:
        logger.error(f"Photo analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/generate-report")
async def generate_report(request: Request, db: Session = Depends(get_db)):
    user = await require_manager(request, db)
    
    rejected = db.query(TaskSubmission).filter(TaskSubmission.status == "rejected").all()
    
    if not LLM_AVAILABLE:
        return {"report": "AI report not available", "rejected_count": len(rejected)}
    
    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"report_{uuid.uuid4().hex[:8]}",
            system_message="You are a business analyst."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        data_summary = f"Rejected: {len(rejected)}"
        response = await chat.send_message(UserMessage(text=f"Analyze: {data_summary}"))
        
        return {"report": response, "period": "Last 7 days", "rejected_count": len(rejected)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== NOTIFICATIONS TEST ====================

@api_router.post("/notifications/test-sms")
async def test_sms(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    twilio_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    if not twilio_sid or twilio_sid == 'your_twilio_account_sid_here':
        return {"status": "not_configured", "message": "Twilio not configured"}
    return {"status": "configured", "message": "SMS ready"}

@api_router.post("/notifications/test-email")
async def test_email(request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    resend_key = os.environ.get('RESEND_API_KEY', '')
    if not resend_key or resend_key == 'your_resend_api_key_here':
        return {"status": "not_configured", "message": "Resend not configured"}
    return {"status": "configured", "message": "Email ready"}

# ==================== PUSH ====================

@api_router.post("/push/register")
async def register_push(token_req: PushTokenRequest, request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    existing = db.query(PushToken).filter(PushToken.user_id == user.user_id).first()
    if existing:
        existing.token = token_req.token
        existing.updated_at = datetime.now(timezone.utc)
    else:
        push = PushToken(user_id=user.user_id, token=token_req.token)
        db.add(push)
    db.commit()
    return {"message": "Push token registered"}

# ==================== INVENTORY ROUTES ====================

@api_router.get("/inventory")
async def get_inventory_requests(request: Request, status: Optional[str] = None, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    query = db.query(InventoryRequest)
    if user.role != "manager":
        query = query.filter(InventoryRequest.supervisor_id == user.user_id)
    if status:
        query = query.filter(InventoryRequest.status == status)
    
    requests = query.order_by(InventoryRequest.created_at.desc()).all()
    result = []
    for r in requests:
        store = db.query(Store).filter(Store.store_id == r.store_id).first()
        result.append({
            "request_id": r.request_id, "task_id": r.task_id, "store_id": r.store_id,
            "supervisor_id": r.supervisor_id, "item_name": r.item_name, "quantity": r.quantity,
            "urgency": r.urgency, "notes": r.notes, "status": r.status, "created_at": r.created_at,
            "store_info": {"store_id": store.store_id, "name": store.name} if store else None
        })
    return result

@api_router.post("/inventory")
async def create_inventory_request(req: InventoryRequestCreate, request: Request, db: Session = Depends(get_db)):
    user = await require_auth(request, db)
    
    request_id = f"inv_{uuid.uuid4().hex[:12]}"
    new_req = InventoryRequest(
        request_id=request_id,
        task_id=req.task_id,
        store_id=req.store_id,
        supervisor_id=user.user_id,
        item_name=req.item_name,
        quantity=req.quantity,
        urgency=req.urgency,
        notes=req.notes
    )
    db.add(new_req)
    db.commit()
    
    return {"request_id": request_id}

@api_router.put("/inventory/{request_id}")
async def update_inventory_request(request_id: str, status: str, request: Request, db: Session = Depends(get_db)):
    await require_manager(request, db)
    
    inv_req = db.query(InventoryRequest).filter(InventoryRequest.request_id == request_id).first()
    if not inv_req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    inv_req.status = status
    if status == "fulfilled":
        inv_req.fulfilled_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Request updated"}

# ==================== SEED DATA ENDPOINTS ====================

# Mall coordinates for seeding
MALLS_DATA = [
    # Pune Malls
    {"name": "Seasons Mall", "latitude": 18.519882, "longitude": 73.931274, "city": "Pune", "state": "Maharashtra"},
    {"name": "Amanora Mall", "latitude": 18.518704, "longitude": 73.934200, "city": "Pune", "state": "Maharashtra"},
    {"name": "Phoenix Marketcity Pune", "latitude": 18.5619, "longitude": 73.9169, "city": "Pune", "state": "Maharashtra"},
    {"name": "ICC Pavillion Mall", "latitude": 18.5308, "longitude": 73.8366, "city": "Pune", "state": "Maharashtra"},
    {"name": "Westend Mall", "latitude": 18.5637, "longitude": 73.8075, "city": "Pune", "state": "Maharashtra"},
    {"name": "KOPA Mall", "latitude": 18.5367, "longitude": 73.8945, "city": "Pune", "state": "Maharashtra"},
    {"name": "Kumar Pacific Mall", "latitude": 18.5018, "longitude": 73.8726, "city": "Pune", "state": "Maharashtra"},
    {"name": "Aero Mall", "latitude": 18.5793, "longitude": 73.9091, "city": "Pune", "state": "Maharashtra"},
    {"name": "Creaticity Mall", "latitude": 18.5610, "longitude": 73.9114, "city": "Pune", "state": "Maharashtra"},
    {"name": "Tribeca Highstreet", "latitude": 18.5292, "longitude": 73.9073, "city": "Pune", "state": "Maharashtra"},
    {"name": "Phoenix Mall of the Millennium", "latitude": 18.6003, "longitude": 73.7586, "city": "Pune", "state": "Maharashtra"},
    {"name": "Alpha One Mall", "latitude": 18.6281, "longitude": 73.7997, "city": "Pune", "state": "Maharashtra"},
    {"name": "Paranjape Mall", "latitude": 18.5117, "longitude": 73.8070, "city": "Pune", "state": "Maharashtra"},
    {"name": "Ascent Mall", "latitude": 18.6120, "longitude": 73.7890, "city": "Pune", "state": "Maharashtra"},
    # Standalone Locations
    {"name": "Baner", "latitude": 18.5590, "longitude": 73.7868, "city": "Pune", "state": "Maharashtra"},
    {"name": "Kharadi", "latitude": 18.5516, "longitude": 73.9340, "city": "Pune", "state": "Maharashtra"},
    {"name": "Wagholi", "latitude": 18.5793, "longitude": 74.0260, "city": "Pune", "state": "Maharashtra"},
    {"name": "Undri", "latitude": 18.4515, "longitude": 73.9077, "city": "Pune", "state": "Maharashtra"},
    {"name": "Pashan Road", "latitude": 18.5421, "longitude": 73.8027, "city": "Pune", "state": "Maharashtra"},
    {"name": "Vishrantwadi", "latitude": 18.5821, "longitude": 73.8785, "city": "Pune", "state": "Maharashtra"},
    {"name": "Bhagirathi Square", "latitude": 18.5315, "longitude": 73.8567, "city": "Pune", "state": "Maharashtra"},
    {"name": "Loni Kalbhor", "latitude": 18.4731, "longitude": 74.0127, "city": "Pune", "state": "Maharashtra"},
    {"name": "Chakan", "latitude": 18.7606, "longitude": 73.8636, "city": "Pune", "state": "Maharashtra"},
    {"name": "Kurkumbh", "latitude": 18.4074, "longitude": 74.0534, "city": "Pune", "state": "Maharashtra"},
]

# Store name to mall mapping keywords
MALL_KEYWORDS = {
    "Seasons Mall": ["Seasons Mall", "Seasons"],
    "Amanora Mall": ["Amanora"],
    "Phoenix Marketcity Pune": ["Phoenix Market", "Phonix Market", "Market City"],
    "ICC Pavillion Mall": ["ICC", "Pavillion"],
    "Westend Mall": ["Westend", "West End"],
    "KOPA Mall": ["KOPA"],
    "Kumar Pacific Mall": ["Kumar Pacific"],
    "Aero Mall": ["Aero"],
    "Creaticity Mall": ["Creaticity"],
    "Tribeca Highstreet": ["Tribeca"],
    "Phoenix Mall of the Millennium": ["Millennium"],
    "Alpha One Mall": ["Alpha One"],
    "Paranjape Mall": ["Paranjape"],
    "Ascent Mall": ["Ascent"],
    "Baner": ["Baner"],
    "Kharadi": ["Kharadi", "Khardi"],
    "Wagholi": ["Wagholi"],
    "Undri": ["Undri"],
    "Pashan Road": ["Pashan"],
    "Vishrantwadi": ["Vishrantwadi"],
    "Bhagirathi Square": ["Bhagirathi"],
    "Loni Kalbhor": ["Loni Kalbhor"],
    "Chakan": ["Chakan"],
    "Kurkumbh": ["Kurkumbh"],
}


def find_mall_for_store(store_name):
    """Find the mall that matches the store name based on keywords."""
    if not store_name:
        return None
    
    store_name_lower = str(store_name).lower()
    
    for mall_name, keywords in MALL_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in store_name_lower:
                return mall_name
    
    return None


@api_router.post("/seed/malls")
async def seed_malls(request: Request, db: Session = Depends(get_db)):
    """
    Seed the database with malls from the predefined list.
    This endpoint adds all the malls with their coordinates for geofencing.
    """
    await require_manager(request, db)
    
    malls_created = 0
    malls_skipped = 0
    
    for mall_data in MALLS_DATA:
        # Check if mall already exists
        existing_mall = db.query(Mall).filter(
            Mall.name == mall_data["name"],
            Mall.city == mall_data["city"]
        ).first()
        
        if existing_mall:
            malls_skipped += 1
            logger.info(f"Mall already exists: {mall_data['name']}")
        else:
            mall_id = f"mall_{uuid.uuid4().hex[:12]}"
            new_mall = Mall(
                mall_id=mall_id,
                name=mall_data["name"],
                city=mall_data["city"],
                state=mall_data["state"],
                address="",
                latitude=mall_data["latitude"],
                longitude=mall_data["longitude"]
            )
            db.add(new_mall)
            db.commit()
            malls_created += 1
            logger.info(f"Created mall: {mall_data['name']}")
    
    return {
        "message": "Malls seeded successfully",
        "malls_created": malls_created,
        "malls_skipped": malls_skipped
    }


@api_router.get("/malls/with-stores")
async def get_malls_with_stores(db: Session = Depends(get_db)):
    """
    Get all malls with their stores in a hierarchical format for dropdown.
    Returns malls grouped with their stores for easy selection.
    """
    malls = db.query(Mall).all()
    
    result = []
    for mall in malls:
        stores = db.query(Store).filter(Store.mall_id == mall.mall_id).all()
        store_list = []
        for store in stores:
            # Use store location if available, otherwise use mall location
            lat = store.latitude if store.latitude else mall.latitude
            lng = store.longitude if store.longitude else mall.longitude
            
            store_list.append({
                "store_id": store.store_id,
                "name": store.name,
                "store_code": store.store_code,
                "location": {"lat": lat, "lng": lng},
                "radius": store.radius
            })
        
        result.append({
            "mall_id": mall.mall_id,
            "name": mall.name,
            "city": mall.city,
            "state": mall.state,
            "latitude": mall.latitude,
            "longitude": mall.longitude,
            "stores": store_list
        })
    
    return {"malls": result}

# ==================== MOUNT ROUTER ====================

app.include_router(api_router)

# Handle CORS for development and production
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# Add production URL from environment variable if set
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)
    # Also add the URL without trailing slash if present
    if frontend_url.endswith("/"):
        origins.append(frontend_url[:-1])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    engine.dispose()
