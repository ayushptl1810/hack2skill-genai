import os
import tempfile
import shutil
from pathlib import Path
from typing import List
from fastapi import UploadFile

async def save_upload_file(upload_file: UploadFile) -> str:
    """
    Save an uploaded file to a temporary location
    
    Args:
        upload_file: FastAPI UploadFile object
        
    Returns:
        Path to the saved temporary file
    """
    try:
        # Create temporary file with appropriate extension
        suffix = Path(upload_file.filename).suffix if upload_file.filename else ""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        
        # Write uploaded content to temporary file
        content = await upload_file.read()
        temp_file.write(content)
        temp_file.close()
        
        return temp_file.name
        
    except Exception as e:
        print(f"Error saving uploaded file: {e}")
        raise

def cleanup_temp_files(file_paths: List[str]) -> None:
    """
    Clean up temporary files
    
    Args:
        file_paths: List of file paths to delete
    """
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                print(f"Cleaned up temporary file: {file_path}")
        except Exception as e:
            print(f"Error cleaning up file {file_path}: {e}")

def cleanup_temp_directories(dir_paths: List[str]) -> None:
    """
    Clean up temporary directories
    
    Args:
        dir_paths: List of directory paths to delete
    """
    for dir_path in dir_paths:
        try:
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
                print(f"Cleaned up temporary directory: {dir_path}")
        except Exception as e:
            print(f"Error cleaning up directory {dir_path}: {e}")

def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename
    
    Args:
        filename: Name of the file
        
    Returns:
        File extension (including the dot)
    """
    return Path(filename).suffix.lower()

def is_valid_image_file(filename: str) -> bool:
    """
    Check if filename represents a valid image file
    
    Args:
        filename: Name of the file
        
    Returns:
        True if valid image file
    """
    valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
    return get_file_extension(filename) in valid_extensions

def is_valid_video_file(filename: str) -> bool:
    """
    Check if filename represents a valid video file
    
    Args:
        filename: Name of the file
        
    Returns:
        True if valid video file
    """
    valid_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'}
    return get_file_extension(filename) in valid_extensions

def create_temp_directory() -> str:
    """
    Create a temporary directory
    
    Returns:
        Path to the created temporary directory
    """
    return tempfile.mkdtemp()

def get_file_size(file_path: str) -> int:
    """
    Get file size in bytes
    
    Args:
        file_path: Path to the file
        
    Returns:
        File size in bytes
    """
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0

def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format
    
    Args:
        size_bytes: File size in bytes
        
    Returns:
        Formatted file size string
    """
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"
