"""
Script to list all active sessions in real-time.

Run this script to monitor active sessions.
Usage: python scripts/list_active_sessions.py
"""

import sys
import os
import time
import logging
from datetime import datetime, timezone

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.auth import Session, User
from app.services.auth_service import AuthService

# Disable sqlalchemy logging for cleaner output
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)


def clear_screen():
    """Clear terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')


def list_sessions():
    """Query and display active sessions."""
    db = SessionLocal()
    
    try:
        # cleanup expired first to show only valid ones
        AuthService.cleanup_expired_sessions(db)
        
        # Get all sessions joined with users
        sessions = db.query(Session).join(User).order_by(Session.created_at.desc()).all()
        
        clear_screen()
        print(f"\n=== ACTIVE SESSIONS MONITOR === {datetime.now().strftime('%H:%M:%S')}")
        print("-" * 105)
        print(f"{'USERNAME':<15} | {'IP ADDRESS':<15} | {'LOCATION':<20} | {'CREATED AT':<20} | {'EXPIRES IN':<15}")
        print("-" * 105)
        
        now = datetime.now(timezone.utc)
        
        if not sessions:
            print("No active sessions found.")
        
        for s in sessions:
            # Handle timezone awareness for calculation
            expires_at = s.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            # Calculate remaining time
            remaining = expires_at - now
            mins, secs = divmod(remaining.total_seconds(), 60)
            hours, mins = divmod(mins, 60)
            days, hours = divmod(hours, 24)
            
            time_str = f"{int(days)}d {int(hours)}h {int(mins)}m"
            
            created_str = s.created_at.strftime("%Y-%m-%d %H:%M")
            ip = s.ip_address or "Unknown"
            loc = s.location or "Unknown"
            
            print(f"{s.user.username:<15} | {ip:<15} | {loc:<20} | {created_str:<20} | {time_str:<15}")
            
        print("-" * 105)
        print(f"Total: {len(sessions)} active sessions")
        print("\nPress Ctrl+C to exit.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting session monitor...")
    try:
        while True:
            list_sessions()
            time.sleep(2)  # Refresh every 2 seconds
    except KeyboardInterrupt:
        print("\nMonitor stopped.")
