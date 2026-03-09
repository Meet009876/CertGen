"""
Script to create test users.

Run this script to manually add users to the database.
Usage: python scripts/create_test_users.py
"""

import sys
import os
import getpass
import logging

# Add project root to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal, init_db
from app.models.auth import User
from app.models import auth as auth_models  # noqa: F401
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def create_user():
    """Interactive function to create a new user."""
    print("\n=== Create Test User ===")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Get input
        username = input("Enter username: ").strip()
        if not username:
            print("Error: Username cannot be empty.")
            return

        # Check if user exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"Error: User '{username}' already exists.")
            return

        password = getpass.getpass("Enter password: ").strip()
        if not password:
            print("Error: Password cannot be empty.")
            return
            
        confirm_password = getpass.getpass("Confirm password: ").strip()
        if password != confirm_password:
            print("Error: Passwords do not match.")
            return

        # Create user
        user = User(
            username=username,
            password=password,  # Storing plain text for testing as requested
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"\n[SUCCESS] User created successfully!")
        print(f"ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Password: {user.password}")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to create user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # Ensure tables exist
    print(f"Database: {settings.DATABASE_URL}")
    init_db()
    
    while True:
        create_user()
        
        again = input("\nCreate another user? (y/n): ").lower()
        if again != 'y':
            break
            
    print("\nDone.")
