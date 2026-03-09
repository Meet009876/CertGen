"""
Script to add `location` column to existing sessions table.

Run this once to migrate the database schema.
Usage: python scripts/add_location_column.py
"""

import sys
import os
import logging
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Add location column to sessions table using raw SQL."""
    print("Migrating database schema...")
    db = SessionLocal()
    try:
        # Check if column exists first (SQLite specific check)
        check_sql = text("PRAGMA table_info(sessions)")
        result = db.execute(check_sql).fetchall()
        columns = [row[1] for row in result]
        
        if "location" in columns:
            print("Column 'location' already exists. Skipping migration.")
            return

        # Add column
        alter_sql = text("ALTER TABLE sessions ADD COLUMN location VARCHAR(255)")
        db.execute(alter_sql)
        db.commit()
        print("SUCCESS: Added 'location' column to 'sessions' table.")
        
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
