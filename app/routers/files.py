import os
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from fastapi.responses import FileResponse
from bson import ObjectId
import uuid
from datetime import datetime, timezone

from app.models.user import User
from app.models.file import File as FileModel
from app.models.folder import Folder as FolderModel, FolderCreate
from app.database.connection import get_files_collection, get_folders_collection
from app.utils import get_current_user, UPLOAD_DIRECTORY

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

router = APIRouter(tags=["Files"])

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "image/bmp", "image/tiff",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/flac",
    "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo",
    "application/zip", "application/x-rar-compressed", "application/x-tar",
    "application/gzip", "application/x-7z-compressed",
    "application/json",
}


@router.post("/folders", response_model=FolderModel)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
):
    logger.debug(f"Creating folder with data: {folder_data}")

    if not folder_data.name or len(folder_data.name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder name cannot be empty",
        )

    folders_collection = await get_folders_collection()

    if folder_data.parent_id:
        try:
            parent_folder = await folders_collection.find_one(
                {"_id": ObjectId(folder_data.parent_id)}
            )
            if not parent_folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent folder not found",
                )
            if parent_folder["user_id"] != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this folder",
                )
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid parent folder ID format: {str(e)}",
            )

    folder_path = os.path.join(UPLOAD_DIRECTORY, f"folder_{uuid.uuid4()}")
    os.makedirs(folder_path, exist_ok=True)

    folder_metadata = {
        "name": folder_data.name.strip(),
        "user_id": current_user.id,
        "parent_id": folder_data.parent_id,
        "path": folder_path,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = await folders_collection.insert_one(folder_metadata)
        logger.debug(f"Folder created with ID: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Failed to create folder in database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create folder. Please try again.",
        )

    folder_doc = await folders_collection.find_one({"_id": result.inserted_id})
    if not folder_doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Folder created but could not be retrieved.",
        )

    folder_doc["id"] = str(folder_doc["_id"])
    return FolderModel(**folder_doc)


@router.get("/folders", response_model=List[FolderModel])
async def list_folders(
    parent_id: str = None,
    current_user: User = Depends(get_current_user),
):
    query = {"user_id": current_user.id}
    query["parent_id"] = parent_id if parent_id else None

    try:
        folders_collection = await get_folders_collection()
        folders = []
        async for folder in folders_collection.find(query):
            folder["id"] = str(folder["_id"])
            folders.append(FolderModel(**folder))
        return folders
    except Exception as e:
        logger.error(f"Error retrieving folders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve folders. Please try again.",
        )


@router.post("/upload", response_model=FileModel)
async def upload_file(
    file: UploadFile = File(...),
    folder_id: str = Form(None),
    current_user: User = Depends(get_current_user),
):
    logger.debug(f"Upload - file: {file.filename}, folder_id: {folder_id}, user: {current_user.id}")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file.content_type}' is not allowed.",
        )

    folder_path = UPLOAD_DIRECTORY
    target_folder_id = None

    if folder_id and folder_id.strip():
        folder_id = folder_id.strip()
        try:
            folders_collection = await get_folders_collection()
            target_folder = await folders_collection.find_one({"_id": ObjectId(folder_id)})
            if not target_folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found",
                )
            if target_folder["user_id"] != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this folder",
                )
            folder_path = target_folder["path"]
            target_folder_id = folder_id
            os.makedirs(folder_path, exist_ok=True)

            if not os.access(folder_path, os.W_OK):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server cannot write to the destination folder",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing folder ID {folder_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid folder ID.",
            )
    else:
        folder_path = os.path.join(UPLOAD_DIRECTORY, f"user_{current_user.id}")
        os.makedirs(folder_path, exist_ok=True)

    try:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(folder_path, unique_filename)

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        file_metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file_size,
            "user_id": current_user.id,
            "folder_id": target_folder_id,
            "path": file_path,
            "created_at": datetime.now(timezone.utc),
        }

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Failed to save file to {file_path}")

        files_collection = await get_files_collection()
        result = await files_collection.insert_one(file_metadata)

        file_data = await files_collection.find_one({"_id": result.inserted_id})
        file_data["id"] = str(file_data["_id"])

        return FileModel(**file_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file. Please try again.",
        )


@router.get("/files", response_model=List[FileModel])
async def list_files(
    folder_id: str = None,
    current_user: User = Depends(get_current_user),
):
    query = {"user_id": current_user.id}
    if folder_id:
        query["folder_id"] = folder_id

    files_collection = await get_files_collection()
    files = []
    async for file in files_collection.find(query):
        file["id"] = str(file["_id"])
        files.append(FileModel(**file))
    return files


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    files_collection = await get_files_collection()
    file = await files_collection.find_one({"_id": ObjectId(file_id)})

    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this file",
        )

    if not os.path.exists(file["path"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server",
        )

    return FileResponse(
        path=file["path"],
        filename=file["filename"],
        media_type=file["content_type"],
    )


@router.delete("/delete/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    files_collection = await get_files_collection()
    file = await files_collection.find_one({"_id": ObjectId(file_id)})

    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this file",
        )

    if os.path.exists(file["path"]):
        os.remove(file["path"])

    await files_collection.delete_one({"_id": ObjectId(file_id)})
    return None


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user),
):
    logger.debug(f"Deleting folder: {folder_id}")

    try:
        folders_collection = await get_folders_collection()
        files_collection = await get_files_collection()
        folder = await folders_collection.find_one({"_id": ObjectId(folder_id)})

        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found"
            )

        if folder["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this folder",
            )

        async def get_subfolder_ids(parent_id):
            subfolder_ids = []
            async for subfolder in folders_collection.find({"parent_id": parent_id}):
                subfolder_ids.append(str(subfolder["_id"]))
                subfolder_ids.extend(await get_subfolder_ids(str(subfolder["_id"])))
            return subfolder_ids

        folder_ids_to_delete = [folder_id]
        folder_ids_to_delete.extend(await get_subfolder_ids(folder_id))

        for fid in folder_ids_to_delete:
            async for f in files_collection.find({"folder_id": fid}):
                if os.path.exists(f["path"]):
                    try:
                        os.remove(f["path"])
                    except Exception as e:
                        logger.error(f"Error deleting file {f['path']}: {str(e)}")

            await files_collection.delete_many({"folder_id": fid})

            folder_doc = await folders_collection.find_one({"_id": ObjectId(fid)})
            if folder_doc and os.path.exists(folder_doc["path"]):
                try:
                    shutil.rmtree(folder_doc["path"])
                except Exception as e:
                    logger.error(f"Error deleting folder directory {folder_doc['path']}: {str(e)}")

        await folders_collection.delete_many(
            {"_id": {"$in": [ObjectId(fid) for fid in folder_ids_to_delete]}}
        )

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete folder. Please try again.",
        )
