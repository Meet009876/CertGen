import uuid
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base, GUID

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    certificate_number = Column(String(255), nullable=False, index=True, unique=True)
    template_id = Column(GUID(), ForeignKey("templates.id", ondelete="SET NULL"), nullable=True)
    template = relationship("Template", backref="certificates")
    url = Column(String(1024), nullable=True)
    certificate_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Certificate(id={self.id}, number='{self.certificate_number}')>"
