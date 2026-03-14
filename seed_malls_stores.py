from datetime import datetime
import os
import openpyxl
import uuid
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Database URL - using Supabase from .env
DATABASE_URL = "postgresql://postgres:Shriyash%402004@db.nqmjgjjvmgrdgawnkqbr.supabase.co:5432/postgres"

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
    created_at = Column(DateTime, default=datetime.now)
    
    stores = relationship("Store", back_populates="mall")


class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(String, primary_key=True)
    mall_id = Column(String, ForeignKey("malls.mall_id"))
    name = Column(String, nullable=False)
    store_code = Column(String, nullable=True)  # Changed to String as some codes might be alphanumeric
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius = Column(Integer, default=100)
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    
    mall = relationship("Mall", back_populates="stores")


engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mall coordinates provided by user
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

# Mapping of store name keywords to mall names (Must match MALLS_DATA names)
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


def seed_malls_and_stores():
    """Seed the database with malls and stores from the Excel file."""
    
    # Create tables
    print("Connecting to database and creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # First, create all malls
        mall_id_map = {}
        
        print("\n=== Seeding Malls/Locations ===")
        for mall_data in MALLS_DATA:
            # Check if mall already exists
            existing_mall = db.query(Mall).filter(
                Mall.name == mall_data["name"],
                Mall.city == mall_data["city"]
            ).first()
            
            if existing_mall:
                # Update coordinates just in case they changed
                existing_mall.latitude = mall_data["latitude"]
                existing_mall.longitude = mall_data["longitude"]
                db.commit()
                mall_id_map[mall_data["name"]] = existing_mall.mall_id
                print(f"Mall exists (updated coords): {mall_data['name']}")
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
                mall_id_map[mall_data["name"]] = mall_id
                print(f"Created mall: {mall_data['name']}")
        
        # Now read the Excel file and create stores
        print("\n=== Reading Excel and Seeding Stores ===")
        wb = openpyxl.load_workbook('Luxlevel Tracker Q3.xlsx')
        ws = wb.active
        
        stores_created = 0
        stores_skipped = 0
        
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row): continue
            
            store_code = row[6]  # Store Code column
            store_name = row[7]  # Store Name / Location column
            
            if not store_code and not store_name:
                continue
            
            # Find the mall for this store
            mall_name = find_mall_for_store(store_name)
            
            if mall_name and mall_name in mall_id_map:
                mall_id = mall_id_map[mall_name]
                
                # Check if store already exists
                existing_store = db.query(Store).filter(
                    Store.store_code == str(store_code)
                ).first()
                
                if existing_store:
                    print(f"Store already exists: {store_name} ({store_code})")
                    stores_skipped += 1
                else:
                    # Create the store
                    store_id = f"store_{uuid.uuid4().hex[:12]}"
                    
                    # Get mall coordinates for geofencing
                    mall = db.query(Mall).filter(Mall.mall_id == mall_id).first()
                    
                    new_store = Store(
                        store_id=store_id,
                        mall_id=mall_id,
                        name=str(store_name) if store_name else f"Store {store_code}",
                        store_code=str(store_code) if store_code else None,
                        latitude=mall.latitude if mall else None,
                        longitude=mall.longitude if mall else None,
                        radius=100  # Default 100m geofence radius
                    )
                    db.add(new_store)
                    db.commit()
                    print(f"Created store: {store_name} ({store_code}) -> {mall_name}")
                    stores_created += 1
            else:
                print(f"UNMAPPED: {store_name} ({store_code})")
                stores_skipped += 1
        
        print(f"\n=== Summary ===")
        print(f"Locations processed: {len(MALLS_DATA)}")
        print(f"Stores created: {stores_created}")
        print(f"Stores skipped/existing: {stores_skipped}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_malls_and_stores()