"""
Asset hosting factory
======================
This is the ONLY place in the codebase that decides which hosting provider
to use at runtime.  All other code imports ``get_asset_host()`` and works
with the returned ``BaseAssetHost`` — it never knows which provider is active.

HOW TO ADD A NEW PROVIDER
--------------------------
1. Create  app/services/asset_hosting/<provider>.py
2. Subclass BaseAssetHost and implement ``upload()``
3. Add the provider's config fields to  app/config.py  (Settings class)
4. Add an ``elif provider == "<your_key>":`` branch below
5. Set  ASSET_HOST_PROVIDER=<your_key>  in .env

CURRENTLY SUPPORTED PROVIDERS
------------------------------
  "dropbox"  →  DropboxAssetHost   (dropbox.py)

EXAMPLE .env
------------
  ASSET_HOST_PROVIDER=dropbox
  DROPBOX_ACCESS_TOKEN=sl.xxxxxxx
  DROPBOX_UPLOAD_FOLDER=/pdf-assets
"""
import logging
from functools import lru_cache

from .base import BaseAssetHost

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_asset_host() -> BaseAssetHost:
    """
    Factory that returns the configured asset hosting provider.

    The instance is **cached** via ``lru_cache`` — provider clients are
    expensive to create (SDK init, token validation), so we build them once
    on the first request and reuse them for the lifetime of the process.

    Returns:
        A ready-to-use BaseAssetHost implementation.

    Raises:
        ValueError:  ASSET_HOST_PROVIDER is set to an unknown value, or
                     required credentials are missing.
    """
    # Defer config import to avoid circular imports at module-load time
    from ...config import settings

    provider = settings.ASSET_HOST_PROVIDER.lower().strip()
    logger.info("Initialising asset host provider: '%s'", provider)

    # ── Dropbox ──────────────────────────────────────────────────────────────
    if provider == "dropbox":
        from .dropbox import DropboxAssetHost

        return DropboxAssetHost(
            app_key=settings.DROPBOX_APP_KEY,
            app_secret=settings.DROPBOX_APP_SECRET,
            refresh_token=settings.DROPBOX_REFRESH_TOKEN,
            upload_folder=settings.DROPBOX_UPLOAD_FOLDER,
        )

    # ── Add more providers here ───────────────────────────────────────────────
    # elif provider == "s3":
    #     from .s3 import S3AssetHost
    #     return S3AssetHost(
    #         bucket=settings.S3_BUCKET,
    #         region=settings.S3_REGION,
    #         access_key=settings.AWS_ACCESS_KEY_ID,
    #         secret_key=settings.AWS_SECRET_ACCESS_KEY,
    #     )
    #
    # elif provider == "azure_blob":
    #     from .azure_blob import AzureBlobAssetHost
    #     return AzureBlobAssetHost(
    #         connection_string=settings.AZURE_STORAGE_CONNECTION_STRING,
    #         container=settings.AZURE_CONTAINER_NAME,
    #     )
    # ─────────────────────────────────────────────────────────────────────────

    raise ValueError(
        f"Unknown ASSET_HOST_PROVIDER='{provider}'. "
        f"Supported values: 'dropbox'. "
        f"Check your .env file and the factory in app/services/asset_hosting/__init__.py"
    )
