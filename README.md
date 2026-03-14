# Mall-Ops: Management System

This project manages mall operations, geofencing-based checklists, and task tracking for supervisors and managers.

## 🛠 Database Recovery & Repopulation

If the Supabase database is paused, loses data, or needs to be reset, you can use the automated recovery script.

### Prerequisites
Ensure you have the following Python packages installed:
```bash
pip install sqlalchemy psycopg2-binary openpyxl
```

### Running the Repopulation Script
Run the following command from the project root:
```bash
python repopulate_db.py
```

**What this script does:**
1. **Creates Tables**: Automatically creates all necessary database tables (`malls`, `stores`, `tasks`, `users`, `submissions`, etc.).
2. **Geofencing Data**: Restores latitude/longitude coordinates for all 14 malls and 10 standalone locations in Pune.
3. **Store Mapping**: Reads `Luxlevel Tracker Q3.xlsx` and maps every individual store (e.g., Trends, Digital, Smart) to its respective building building polygon.
4. **Initial Data**: Seeds the manager account (`Maruti.Patil@clrservices.com`) and standardizes 17 task templates.

## 📊 Why are there 106 stores?

The database now contains 106 stores because the script processed the **entire `Luxlevel Tracker Q3.xlsx` sheet**. 

While there are only **24 major locations** (buildings like Seasons Mall, Amanora, etc.), many of these buildings contain multiple individual store units. For example:
- **Phoenix Marketcity Pune**: 20 individual stores
- **KOPA Mall**: 18 individual stores
- **ICC Pavillion Mall**: 11 individual stores

The script treats each row in your Excel sheet as a unique store but assigns them the **coordinates of the parent building** for geofencing purposes. This ensures that a supervisor's location is verified against the correct mall building regardless of which specific shop they are checking.
