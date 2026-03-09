from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db, SessionLocal
from .routes import templates_router, pdf_router, auth_router, team_members_router
# , uploads_router

# Import auth models so they are registered with Base for table creation
from .models import auth as auth_models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("[*] Starting PDF Template API...")
    print(f"[DB] Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    
    # Initialize database tables (including users and sessions)
    init_db()
    print("[OK] Database initialized")
    
    # Cleanup expired sessions
    from .services.auth_service import AuthService
    db = SessionLocal()
    try:
        expired_count = AuthService.cleanup_expired_sessions(db)
        if expired_count > 0:
            print(f"[OK] Cleaned up {expired_count} expired sessions")
        
        # Seed default admin user if no users exist
        admin = AuthService.seed_default_admin(db)
        if admin:
            print(f"[OK] Default admin user created: {admin.username} / {settings.DEFAULT_ADMIN_PASSWORD}")
    finally:
        db.close()
    
    print(f"[OK] Auth: session-based, cookie={settings.SESSION_COOKIE_NAME}, max_age={settings.SESSION_MAX_AGE}s")
    
    yield
    
    # Shutdown
    print("[!] Shutting down PDF Template API...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description="""
    PDF Template Management API
    
    This API allows you to:
    * Create and manage PDF templates with 4 element types
    * Define static text, text variables, fixed images, and image placeholders
    * Store templates with comprehensive formatting options
    * Retrieve templates for PDF generation
    
    ## Element Types
    
    1. **Static Text** - Fixed text with formatting (font, size, color, etc.)
    2. **Text Variable** - Placeholder for dynamic text values
    3. **Fixed Image** - Embedded image with known URL
    4. **Image Placeholder** - Placeholder for dynamic images
    
    ## Coordinate System
    
    Templates use PDF coordinate system:
    - Origin: Bottom-left corner
    - Units: Points (1 pt = 1/72 inch)
    
    Frontend should convert pixel coordinates to PDF points before sending.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Disposition",
        "X-PDF-Filepath",
        "X-PDF-Storage-Type",
        "X-PDF-Size",
    ],
)

# Include routers
app.include_router(auth_router)
app.include_router(team_members_router)
app.include_router(templates_router)
app.include_router(pdf_router)
# app.include_router(uploads_router)


@app.get("/", tags=["Health"])
async def root():
    """API root endpoint"""
    return {
        "message": "PDF Template API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "healthy"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.APP_ENV
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_DEBUG
    )
