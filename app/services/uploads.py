"""
Upload helpers
==============
Provides pure python functions to upload and delete files 
from the configured cloud storage backend (see app/services/asset_hosting/).
"""
import logging
from ..services.asset_hosting.base import BaseAssetHost

logger = logging.getLogger(__name__)


async def process_file_upload(asset_host: BaseAssetHost, file_bytes: bytes, upload_filename: str, mime_type: str) -> str:
    """
    Uploads a file to the active asset host.
    
    Args:
        file_bytes (bytes): The raw file data.
        upload_filename (str): The filename to store it as.
        mime_type (str): The MIME type of the file.
        
    Returns:
        str: The direct public download URL.
        
    Raises:
        Exception: If the upload to the cloud storage fails.
    """
    # We deliberately let exceptions bubble up to the caller
    url = await asset_host.upload(
        file_bytes=file_bytes,
        filename=upload_filename,
        mime_type=mime_type,
    )
    
    return url

async def delete_hosted_asset(asset_host: BaseAssetHost, upload_filename: str):
    """
    Deletes a file from the active asset host.
    
    Args:
        upload_filename (str): The filename of the asset to delete.
        
    Raises:
        Exception: If the deletion from cloud storage fails.
    """
    # We deliberately let exceptions bubble up to the caller
    await asset_host.delete(upload_filename)
