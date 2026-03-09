# Database Backup Script
# Run this periodically to backup your SQLite database

import shutil
from datetime import datetime
import os

# Backup the database
source = "pdf_templates.db"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = f"backups/pdf_templates_{timestamp}.db"

# Create backups directory if it doesn't exist
os.makedirs("backups", exist_ok=True)

# Copy the database
if os.path.exists(source):
    shutil.copy2(source, backup)
    print(f"✅ Database backed up to: {backup}")
else:
    print(f"❌ Database file not found: {source}")
