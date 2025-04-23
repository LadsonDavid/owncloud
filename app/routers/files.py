import os
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Body, Form
from fastapi.responses import FileResponse
from bson import ObjectId
import uuid
from datetime import datetime

from app.models.user import User
from app.models.file import File as FileModel
from app.models.folder import Folder as FolderModel, FolderCreate
from app.database.connection import get_files_collection, get_folders_collection
from app.utils import get_current_user, UPLOAD_DIRECTORY

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

router = APIRouter(tags=["Files"])

# Create a folder
@router.post("/folders", response_model=FolderModel)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user)
):
    logger.debug(f"Creating folder with data: {folder_data}")
    
    # Validate folder name
    if not folder_data.name or len(folder_data.name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder name cannot be empty"
        )
    
    # Check if parent folder exists if parent_id is provided
    if folder_data.parent_id:
        try:
            folders_collection = await get_folders_collection()
            parent_folder = await folders_collection.find_one({"_id": ObjectId(folder_data.parent_id)})
            if not parent_folder:
                logger.error(f"Parent folder not found: {folder_data.parent_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent folder not found"
                )
            # Check if parent folder belongs to user
            if parent_folder["user_id"] != current_user.id:
                logger.error(f"Permission denied for parent folder: {folder_data.parent_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this folder"
                )
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid parent folder ID: {folder_data.parent_id}, {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid parent folder ID format: {str(e)}"
            )
    
    # Create folder metadata
    folder_path = os.path.join(UPLOAD_DIRECTORY, f"folder_{uuid.uuid4()}")
    os.makedirs(folder_path, exist_ok=True)
    
    folder_metadata = {
        "name": folder_data.name.strip(),
        "user_id": current_user.id,
        "parent_id": folder_data.parent_id,
        "path": folder_path,
        "created_at": datetime.now()
    }
    
    logger.debug(f"Folder metadata: {folder_metadata}")
    
    # Save metadata to database
    try:
        folders_collection = await get_folders_collection()
        result = await folders_collection.insert_one(folder_metadata)
        logger.debug(f"Folder created with ID: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Failed to create folder in database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    
    # Return folder data
    try:
        folders_collection = await get_folders_collection()
        folder_data = await folders_collection.find_one({"_id": result.inserted_id})
        if not folder_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder created but not found in database"
            )
            
        folder_data["id"] = str(folder_data["_id"])
        
        logger.debug(f"Returning folder: {folder_data}")
        
        return FolderModel(**folder_data)
    except Exception as e:
        logger.error(f"Error retrieving created folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Folder created but error retrieving it: {str(e)}"
        )

# Get all folders for user
@router.get("/folders", response_model=List[FolderModel])
async def list_folders(
    parent_id: str = None,
    current_user: User = Depends(get_current_user)
):
    logger.debug(f"Listing folders for user: {current_user.id}, parent_id: {parent_id}")
    
    # Create query based on parent_id
    query = {"user_id": current_user.id}
    if parent_id:
        try:
            query["parent_id"] = parent_id
        except Exception as e:
            logger.error(f"Invalid parent_id format: {parent_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid parent folder ID format: {str(e)}"
            )
    else:
        query["parent_id"] = None  # Root folders
    
    logger.debug(f"Folder query: {query}")
    
    # Get all folders for current user
    try:
        folders_collection = await get_folders_collection()
        cursor = folders_collection.find(query)
        
        folders = []
        async for folder in cursor:
            folder["id"] = str(folder["_id"])
            folders.append(FolderModel(**folder))
        
        logger.debug(f"Found {len(folders)} folders")
        return folders
    except Exception as e:
        logger.error(f"Error retrieving folders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving folders: {str(e)}"
        )

@router.post("/upload", response_model=FileModel)
async def upload_file(
    file: UploadFile = File(...),
    folder_id: str = Form(None),
    current_user: User = Depends(get_current_user)
):
    logger.debug(f"Upload request received - headers: {file.headers}")
    logger.debug(f"Upload parameters - file: {file.filename}, folder_id: {folder_id}, user: {current_user.id}")
    logger.debug(f"Request folder_id type: {type(folder_id).__name__}, value: '{folder_id}'")
    logger.debug(f"Content-Type: {file.content_type}")
    
    # Initialize folder path
    folder_path = UPLOAD_DIRECTORY
    target_folder = None
    
    # Check if folder exists if folder_id is provided
    if folder_id and folder_id.strip():
        folder_id = folder_id.strip()
        logger.debug(f"Folder ID provided and valid: {folder_id}, looking up folder")
        try:
            folders_collection = await get_folders_collection()
            target_folder = await folders_collection.find_one({"_id": ObjectId(folder_id)})
            if not target_folder:
                logger.error(f"Folder not found: {folder_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found"
                )
            # Check if folder belongs to user
            if target_folder["user_id"] != current_user.id:
                logger.error(f"Permission denied for folder: {folder_id}, owned by {target_folder['user_id']}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this folder"
                )
                
            # Use the folder's path
            folder_path = target_folder["path"]
            logger.debug(f"Using folder path: {folder_path}")
            
            # Ensure the folder path exists
            os.makedirs(folder_path, exist_ok=True)
            
            # Verify the path is writable
            if not os.access(folder_path, os.W_OK):
                logger.error(f"Folder path is not writable: {folder_path}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server cannot write to the destination folder"
                )
        except Exception as e:
            logger.error(f"Error processing folder ID {folder_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid folder ID: {str(e)}"
            )
    else:
        # Create user's root directory if it doesn't exist
        folder_path = os.path.join(UPLOAD_DIRECTORY, f"user_{current_user.id}")
        os.makedirs(folder_path, exist_ok=True)
        logger.debug(f"Using root folder path: {folder_path}")
    
    try:
        # Create a unique filename to avoid collisions
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(folder_path, unique_filename)
        
        # Get file size
        file.file.seek(0, 2)  # Seek to end of file
        file_size = file.file.tell()  # Get position (size)
        file.file.seek(0)  # Reset pointer to beginning
        
        # Create file metadata
        file_metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file_size,
            "user_id": current_user.id,
            "folder_id": folder_id,
            "path": file_path,
            "created_at": datetime.now()
        }
        
        # Save file to disk
        logger.debug(f"Saving file to path: {file_path}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Verify file was actually saved
        if not os.path.exists(file_path):
            logger.error(f"File was not saved correctly to {file_path}")
            raise FileNotFoundError(f"Failed to save file to {file_path}")
            
        logger.debug(f"File saved successfully to {file_path}")
        
        # Save metadata to database
        files_collection = await get_files_collection()
        result = await files_collection.insert_one(file_metadata)
        
        # Return file data
        file_data = await files_collection.find_one({"_id": result.inserted_id})
        file_data["id"] = str(file_data["_id"])
        
        return FileModel(**file_data)
        
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.get("/files", response_model=List[FileModel])
async def list_files(
    folder_id: str = None,
    current_user: User = Depends(get_current_user)
):
    # Create query based on folder_id
    query = {"user_id": current_user.id}
    
    # If folder_id is provided, filter by that folder
    if folder_id:
        query["folder_id"] = folder_id
    
    # Get files for current user with optional folder filtering
    files_collection = await get_files_collection()
    cursor = files_collection.find(query)
    
    files = []
    async for file in cursor:
        file["id"] = str(file["_id"])
        files.append(FileModel(**file))
    
    return files

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    # Find file by ID
    files_collection = await get_files_collection()
    file = await files_collection.find_one({"_id": ObjectId(file_id)})
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if user owns the file
    if file["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this file"
        )
    
    # Check if file exists on disk
    if not os.path.exists(file["path"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Return file for download
    return FileResponse(
        path=file["path"],
        filename=file["filename"],
        media_type=file["content_type"]
    )

@router.delete("/delete/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    # Find file by ID
    files_collection = await get_files_collection()
    file = await files_collection.find_one({"_id": ObjectId(file_id)})
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if user owns the file
    if file["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this file"
        )
    
    # Delete file from disk if it exists
    if os.path.exists(file["path"]):
        os.remove(file["path"])
    
    # Delete file metadata from database
    await files_collection.delete_one({"_id": ObjectId(file_id)})
    
    return None

@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    logger.debug(f"Deleting folder: {folder_id}")
    
    try:
        # Find folder by ID
        folders_collection = await get_folders_collection()
        files_collection = await get_files_collection()
        folder = await folders_collection.find_one({"_id": ObjectId(folder_id)})
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Check if user owns the folder
        if folder["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this folder"
            )
        
        # Get all subfolders recursively
        async def get_subfolder_ids(parent_id):
            subfolder_ids = []
            async for subfolder in folders_collection.find({"parent_id": parent_id}):
                subfolder_ids.append(str(subfolder["_id"]))
                subfolder_ids.extend(await get_subfolder_ids(str(subfolder["_id"])))
            return subfolder_ids
        
        # Get all folder IDs to delete
        folder_ids_to_delete = [folder_id]
        folder_ids_to_delete.extend(await get_subfolder_ids(folder_id))
        
        logger.debug(f"Found folders to delete: {folder_ids_to_delete}")
        
        # Delete all files in these folders
        for fid in folder_ids_to_delete:
            # Find and delete files in this folder
            async for file in files_collection.find({"folder_id": fid}):
                if os.path.exists(file["path"]):
                    try:
                        os.remove(file["path"])
                        logger.debug(f"Deleted file: {file['path']}")
                    except Exception as e:
                        logger.error(f"Error deleting file {file['path']}: {str(e)}")
            
            # Delete file records from database
            await files_collection.delete_many({"folder_id": fid})
            
            # Find and delete the folder's physical directory
            folder_to_delete = await folders_collection.find_one({"_id": ObjectId(fid)})
            if folder_to_delete and os.path.exists(folder_to_delete["path"]):
                try:
                    shutil.rmtree(folder_to_delete["path"])
                    logger.debug(f"Deleted folder directory: {folder_to_delete['path']}")
                except Exception as e:
                    logger.error(f"Error deleting folder directory {folder_to_delete['path']}: {str(e)}")
        
        # Delete all folder records from database
        delete_result = await folders_collection.delete_many(
            {"_id": {"$in": [ObjectId(fid) for fid in folder_ids_to_delete]}}
        )
        
        logger.debug(f"Deleted {delete_result.deleted_count} folders from database")
        
        return None
        
    except Exception as e:
        logger.error(f"Error deleting folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete folder: {str(e)}"
        ) 