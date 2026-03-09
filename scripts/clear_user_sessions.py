"""
Script to clear sessions for a specific user.

Usage: python scripts/clear_user_sessions.py [username]
If no username provided, it will prompt for one.
"""

import sys
import os
import logging

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.auth import Session, User

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def clear_sessions(username):
    """Delete all sessions for a user."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            return

        # Delete sessions
        result = db.query(Session).filter(Session.user_id == user.id).delete()
        db.commit()
        
        print(f"SUCCESS: Deleted {result} session(s) for user '{username}'.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_user = sys.argv[1]
    else:
        target_user = input("Enter username to clear sessions for: ").strip()
    
    if target_user:
        clear_sessions(target_user)
    else:
        print("No username provided.")
