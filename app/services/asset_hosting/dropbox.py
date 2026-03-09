"""
Dropbox implementation of BaseAssetHost
========================================
Uses OAuth2 offline flow (App Key + App Secret + Refresh Token).
The SDK silently refreshes the short-lived access token automatically —
you only need to run generate_refresh_token.py ONCE to get the refresh token.

HOW THIS PROVIDER WORKS
------------------------
1. Files are uploaded to a Dropbox folder (default: /pdf-assets).
   Uploads are idempotent — same filename always overwrites the previous file
   (WriteMode.overwrite), so re-uploads are safe.

2. After each upload a shared link is created (or the existing one is reused
   if Dropbox raises SharedLinkAlreadyExistsError).

3. The shared link is converted to a *direct* download URL by replacing
   ?dl=0 with ?dl=1  — no Dropbox preview page, no login required.

CONFIGURATION  (set in .env)
-----------------------------
ASSET_HOST_PROVIDER=dropbox
DROPBOX_APP_KEY=your_app_key          # from Dropbox App Console → Settings
DROPBOX_APP_SECRET=your_app_secret    # from Dropbox App Console → Settings
DROPBOX_REFRESH_TOKEN=your_refresh_token  # run generate_refresh_token.py once
DROPBOX_UPLOAD_FOLDER=/pdf-assets     # absolute Dropbox path; must start with /
"""
import logging

import dropbox
from dropbox.exceptions import ApiError, AuthError
from dropbox.files import WriteMode

from .base import BaseAssetHost

logger = logging.getLogger(__name__)


class DropboxAssetHost(BaseAssetHost):
    """
    Uploads files to a Dropbox folder and returns a direct public download URL.

    Uses OAuth2 offline flow (refresh token) so the connection never expires.
    Instantiate once — the factory in __init__.py caches it via lru_cache.
    """

    def __init__(
        self,
        app_key: str,
        app_secret: str,
        refresh_token: str,
        upload_folder: str = "/pdf-assets",
    ):
        """
        Args:
            app_key:        Dropbox App Key (from App Console → Settings).
            app_secret:     Dropbox App Secret (from App Console → Settings).
            refresh_token:  OAuth2 refresh token obtained by running
                            generate_refresh_token.py once.
            upload_folder:  Absolute Dropbox path to upload into.
                            Must start with '/'.
        """
        if not app_key or not app_secret or not refresh_token:
            raise ValueError(
                "DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN "
                "must all be set in your .env file.\n"
                "Run  python generate_refresh_token.py  once to obtain the refresh token."
            )

        # Normalise folder path
        self._folder = "/" + upload_folder.strip("/")

        # Build the SDK client using refresh-token auth.
        # The SDK will automatically exchange the refresh token for short-lived
        # access tokens and silently refresh them when they expire.
        self._dbx = dropbox.Dropbox(
            oauth2_refresh_token=refresh_token,
            app_key=app_key,
            app_secret=app_secret,
        )

        logger.info("DropboxAssetHost initialised  |  folder=%s", self._folder)

    # ═══════════════════════════════════════════════════════════════════════════
    # Private helpers
    # ═══════════════════════════════════════════════════════════════════════════

    def _dropbox_path(self, filename: str) -> str:
        """Return the full Dropbox path for a given filename."""
        return f"{self._folder}/{filename}"

    def _get_or_create_shared_link(self, dropbox_path: str) -> str:
        """
        Return a Dropbox shared link for the given path.

        Dropbox raises SharedLinkAlreadyExistsError when a link already exists.
        We catch it and retrieve the existing link — makes the call idempotent.
        """
        try:
            result = self._dbx.sharing_create_shared_link_with_settings(dropbox_path)
            return result.url
        except ApiError as exc:
            if exc.error.is_shared_link_already_exists():
                links = self._dbx.sharing_get_shared_links(dropbox_path)
                return links.links[0].url
            raise

    @staticmethod
    def _to_direct_url(shared_link: str) -> str:
        """
        Convert a Dropbox shared link to a direct download URL.

        Dropbox shared links end in ?dl=0 (shows a preview page).
        Setting dl=1 forces an immediate file download — no login required.

        NOTE: If Dropbox ever changes this URL scheme, only this method needs
        to be updated — all call sites stay the same.
        """
        if "?dl=0" in shared_link:
            return shared_link.replace("?dl=0", "?raw=1")
        if "&dl=0" in shared_link:
            return shared_link.replace("&dl=0", "&raw=1")
        if "?" in shared_link:
            return shared_link + "&raw=1"
        return shared_link + "?raw=1"

    # ═══════════════════════════════════════════════════════════════════════════
    # Public interface — satisfies BaseAssetHost contract
    # ═══════════════════════════════════════════════════════════════════════════

    async def upload(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        """
        Upload a file to Dropbox and return a direct public download URL.

        Steps:
          1. Build the destination path inside the configured folder
          2. Upload bytes (overwrite any existing file with the same name)
          3. Create or reuse a shared link
          4. Convert the link to ?dl=1 for direct download
          5. Return the URL

        Args:
            file_bytes: Raw bytes of the file (PDF, PNG, JPEG, …)
            filename:   Name to save in Dropbox
            mime_type:  MIME type — logged for observability only

        Returns:
            Direct public download URL (string)

        Raises:
            AuthError:  Refresh token revoked or credentials wrong.
            ApiError:   Dropbox API error (quota, bad path, permissions, …).
        """
        dropbox_path = self._dropbox_path(filename)
        logger.info(
            "Uploading to Dropbox  |  file='%s'  size=%.1f KB  mime=%s  dest=%s",
            filename, len(file_bytes) / 1024, mime_type, dropbox_path,
        )

        try:
            # ── Upload ───────────────────────────────────────────────────────
            # overwrite = idempotent: same filename always replaces previous version
            self._dbx.files_upload(
                file_bytes,
                dropbox_path,
                mode=WriteMode.overwrite,
                mute=True,  # suppress Dropbox desktop client notifications
            )
        except AuthError:
            logger.error(
                "Dropbox auth failed — refresh token may be revoked. "
                "Re-run generate_refresh_token.py to obtain a new one."
            )
            raise

        logger.info("Upload complete  |  path=%s", dropbox_path)

        # ── Shared link ──────────────────────────────────────────────────────
        shared_link = self._get_or_create_shared_link(dropbox_path)
        logger.info("Shared link  |  %s", shared_link)

        # ── Direct URL ───────────────────────────────────────────────────────
        direct_url = self._to_direct_url(shared_link)
        logger.info("Direct download URL  |  %s", direct_url)

        return direct_url

    async def delete(self, filename: str) -> None:
        """
        Delete a file from Dropbox by its filename.

        Args:
            filename: The filename used when the file was uploaded.

        Silently ignores 'path not found' errors — the file may have already
        been deleted or never successfully uploaded.
        """
        dropbox_path = self._dropbox_path(filename)
        logger.info("Deleting from Dropbox  |  path=%s", dropbox_path)
        try:
            self._dbx.files_delete_v2(dropbox_path)
            logger.info("Deleted from Dropbox  |  path=%s", dropbox_path)
        except ApiError as exc:
            if exc.error.is_path_lookup() and exc.error.get_path_lookup().is_not_found():
                logger.warning("File not found on Dropbox, skipping delete  |  path=%s", dropbox_path)
            else:
                raise
