"""
Asset hosting — abstract base class
====================================
Every hosting provider (Dropbox, S3, Azure Blob, GCS, …) must subclass
BaseAssetHost and implement exactly ONE method: ``upload``.

HOW TO ADD A NEW PROVIDER
--------------------------
1. Create a new Python file in this directory, e.g.  s3.py
2. Subclass BaseAssetHost and implement ``upload()``
3. Add your provider's config fields to  app/config.py  (Settings class)
4. Register it in  app/services/asset_hosting/__init__.py  (the factory)
5. Set  ASSET_HOST_PROVIDER=<your_key>  in your  .env  file

CONTRACT
--------
``upload()`` MUST return a direct, publicly-accessible download URL —
i.e. a URL that downloads or displays the file immediately without any login
page, redirect, or preview interstitial.  The frontend and the PDF generation
service depend on this guarantee.
"""
from abc import ABC, abstractmethod


class BaseAssetHost(ABC):
    """Abstract interface satisfied by every asset hosting provider."""

    @abstractmethod
    async def upload(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        """
        Upload a file to the hosting provider.

        Args:
            file_bytes: Raw binary content of the file.
            filename:   Desired filename in cloud storage.
            mime_type:  MIME type string, e.g. ``'application/pdf'`` or ``'image/png'``.

        Returns:
            A **direct** public download URL as a string.
            Opening this URL must immediately serve the file content —
            no login page, no preview interstitial.

        Raises:
            Exception: Any upload error should propagate so the route
                       handler can return a meaningful HTTP error to the client.
        """
        ...

    @abstractmethod
    async def delete(self, filename: str) -> None:
        """
        Delete a file from the hosting provider.

        Args:
            filename: The filename (not full path) that was used when uploading.

        Raises:
            Exception: Any deletion error should propagate so the caller can log it.
        """
        ...
