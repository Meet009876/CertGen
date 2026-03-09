from sqlalchemy import Column, String, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.sql import func
import uuid


class GUID(TypeDecorator):
    """Platform-independent GUID type that stores as CHAR(32) for SQLite and UUID for PostgreSQL"""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return "%.32x" % uuid.UUID(value).int
            else:
                return "%.32x" % value.int

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            else:
                return value


from ..database import Base


class Template(Base):
    """
    Template model for storing PDF template configurations.
    
    Each template contains:
    - Base PDF information (URL, dimensions)
    - Element metadata (static text, variables, images, placeholders)
    - Timestamps and ownership information
    """
    __tablename__ = "templates"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    base_pdf_asset_id = Column(String(255), nullable=True)
    base_pdf_width = Column(Float, nullable=False)
    base_pdf_height = Column(Float, nullable=False)
    certificate_width = Column(Float, nullable=True)
    certificate_height = Column(Float, nullable=True)
    elements_data = Column(JSON, nullable=False, default={"elements": []})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(GUID(), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    
    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}')>"

class AssetsData(Base):
    """
    Model for storing asset mappings within a template.
    
    This allows frontend to upload binary assets dynamically and maps their
    temporary `asset_id` placeholders in the JSON to the final uploaded URLs.
    """
    __tablename__ = "assets_data"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    template_id = Column(GUID(), ForeignKey("templates.id", ondelete="SET NULL"), nullable=True, index=True) 
    template = relationship("Template", backref="assets")
    asset_id = Column(String(255), nullable=False)
    url = Column(Text, nullable=True) # Null if upload fails after retries
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AssetsData(template_id={self.template_id}, asset_id='{self.asset_id}', has_url={self.url is not None})>"
