import os
import uuid
import openpyxl
import enum
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Enum, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# ==================== CONFIGURATION ====================
DATABASE_URL = "postgresql://postgres:Shriyash%402004@db.nqmjgjjvmgrdgawnkqbr.supabase.co:5432/postgres"
EXCEL_FILE = "Luxlevel Tracker Q3.xlsx"

# ==================== MODELS ====================
Base = declarative_base()

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

class Store(Base):
    __tablename__ = "stores"
    store_id = Column(String, primary_key=True)
    mall_id = Column(String, ForeignKey("malls.mall_id"))
    name = Column(String, nullable=False)
    store_code = Column(String, nullable=True) # Changed to String to handle alphanumeric/leading zeros
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius = Column(Integer, default=100)
    created_by = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    mall = relationship("Mall", back_populates="stores")
    tasks = relationship("Task", back_populates="store")

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    picture = Column(String)
    role = Column(String, default="supervisor")
    mall_name = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

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
    store_code = Column(String, nullable=True)
    store_name = Column(String, nullable=True)
    city = Column(String, default="Pune")
    state = Column(String, default="ROOM 1 (Rest of Maharastra - 1)")
    checklist_date = Column(String, nullable=True)
    store = relationship("Store", back_populates="tasks")

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
    status = Column(String, default="pending")
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime)
    reviewed_by = Column(String)
    manager_remarks = Column(Text)
    ai_photo_analysis = Column(Text)
    completion_time = Column(DateTime)
    task = relationship("Task", back_populates="submissions")

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"))
    session_token = Column(String, unique=True)
    mall_name = Column(String, default="")
    expires_at = Column(DateTime)
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
    recipients = Column(Text)
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

# Update Store and Task with relationship additions
Store.assignments = relationship("SupervisorAssignment", back_populates="store")
Task.submissions = relationship("TaskSubmission", back_populates="task")

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

MALL_KEYWORDS = {
    "Seasons Mall": ["Seasons"],
    "Amanora Mall": ["Amanora"],
    "Phoenix Marketcity Pune": ["Phoenix Market", "Phonix Market", "Market City", "PMC", "Vimannagar"],
    "ICC Pavillion Mall": ["ICC", "Pavillion", "Pavillian"],
    "Westend Mall": ["Westend", "West End", "Aundh"],
    "KOPA Mall": ["KOPA", "Koregaon"],
    "Kumar Pacific Mall": ["Kumar Pacific"],
    "Aero Mall": ["Aero"],
    "Creaticity Mall": ["Creaticity"],
    "Tribeca Highstreet": ["Tribeca"],
    "Phoenix Mall of the Millennium": ["Millennium", "Wakkad", "Wakad"],
    "Alpha One Mall": ["Alpha One", "Alpha Impe"],
    "Paranjape Mall": ["Paranjape"],
    "Ascent Mall": ["Ascent"],
    "Baner": ["Baner"],
    "Kharadi": ["Kharadi", "Khardi", "Almonte"],
    "Wagholi": ["Wagholi", "CPC"],
    "Undri": ["Undri"],
    "Pashan Road": ["Pashan"],
    "Vishrantwadi": ["Vishrantwadi", "W'wadi", "Wadi", "MantraMall"],
    "Bhagirathi Square": ["Bhagirathi"],
    "Loni Kalbhor": ["Loni Kalbhor", "Loni Kalbhore"],
    "Chakan": ["Chakan"],
    "Kurkumbh": ["Kurkumbh", "Kurkhumbh"],
}

# ==================== LOGIC ====================

def find_mall_for_store(store_name):
    if not store_name: return None
    name_lower = str(store_name).lower()
    for mall_name, keywords in MALL_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in name_lower:
                return mall_name
    return None

def repopulate():
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    print("--- STEP 1: Creating Tables ---")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("\n--- STEP 2: Seeding Initial Users & Templates ---")
        # Check if manager exists
        manager_email = "Maruti.Patil@clrservices.com"
        manager = db.query(User).filter(User.email == manager_email).first()
        if not manager:
            manager = User(
                user_id="1",
                email=manager_email,
                name="Maruti Patil",
                role="manager"
            )
            db.add(manager)
            db.commit()
            print(f"Created manager: {manager_email}")
        
        # Seed Templates
        templates = [
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
            "Are all sensors working properly e.g. Door sensors, AC controllers, Motion Sensors etc",
            "Are BOH lights switched off when not necessary",
            "Are temperature settings of all Open chiller (3 deg C to 8 deg C), freezers (-18 deg C) and AC (24 Deg C) set properly",
            "Is Energy Meter log book maintained at store",
        ]
        for idx, t_title in enumerate(templates, 1):
            existing = db.query(TaskTemplate).filter(TaskTemplate.title == t_title).first()
            if not existing:
                template = TaskTemplate(
                    template_id=f"template_{idx}",
                    name=t_title[:50],
                    title=t_title,
                    description=f"Daily checklist: {t_title}",
                    priority="high",
                    photo_required=True,
                    created_by="1"
                )
                db.add(template)
        db.commit()
        print(f"Seeded {len(templates)} task templates.")

        print("\n--- STEP 3: Seeding Malls ---")
        mall_id_map = {}
        for m_data in MALLS_DATA:
            existing = db.query(Mall).filter(Mall.name == m_data["name"]).first()
            if existing:
                existing.latitude = m_data["latitude"]
                existing.longitude = m_data["longitude"]
                db.commit()
                mall_id_map[m_data["name"]] = existing.mall_id
                print(f"Updated Mall: {m_data['name']}")
            else:
                m_id = f"mall_{uuid.uuid4().hex[:12]}"
                new_mall = Mall(
                    mall_id=m_id,
                    name=m_data["name"],
                    city=m_data["city"],
                    state=m_data["state"],
                    latitude=m_data["latitude"],
                    longitude=m_data["longitude"]
                )
                db.add(new_mall)
                db.commit()
                mall_id_map[m_data["name"]] = m_id
                print(f"Created Mall: {m_data['name']}")

        print("\n--- STEP 4: Reading Excel & Seeding Stores ---")
        if not os.path.exists(EXCEL_FILE):
            print(f"ERROR: {EXCEL_FILE} not found!")
            return

        wb = openpyxl.load_workbook(EXCEL_FILE)
        ws = wb.active # Using active sheet
        
        stores_created = 0
        stores_skipped = 0
        
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row): continue
            
            store_code = str(row[6]) if row[6] else None
            store_name = row[7]
            
            if not store_code and not store_name:
                continue
            
            mapped_mall_name = find_mall_for_store(store_name)
            if mapped_mall_name and mapped_mall_name in mall_id_map:
                m_id = mall_id_map[mapped_mall_name]
                
                # Check if store already exists
                existing_store = db.query(Store).filter(Store.store_code == store_code).first()
                if existing_store:
                    print(f"Store exists: {store_name} ({store_code})")
                    stores_skipped += 1
                else:
                    s_id = f"store_{uuid.uuid4().hex[:12]}"
                    mall_obj = db.query(Mall).filter(Mall.mall_id == m_id).first()
                    
                    new_store = Store(
                        store_id=s_id,
                        mall_id=m_id,
                        name=str(store_name) if store_name else f"Store {store_code}",
                        store_code=store_code,
                        latitude=mall_obj.latitude,
                        longitude=mall_obj.longitude,
                        radius=100
                    )
                    db.add(new_store)
                    db.commit()
                    print(f"Created Store: {store_name} ({store_code}) -> {mapped_mall_name}")
                    stores_created += 1
            else:
                print(f"UNMAPPED: {store_name} ({store_code})")
                stores_skipped += 1
        
        print(f"\n--- SUCCESS ---")
        print(f"Malls: {len(MALLS_DATA)}")
        print(f"Stores Created: {stores_created}")
        print(f"Stores Skipped/Existing: {stores_skipped}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    repopulate()
