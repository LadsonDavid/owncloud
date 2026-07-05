from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from os import getenv, environ
from dotenv import load_dotenv
from bson import ObjectId
import os
import secrets

from app.models.user import TokenData, User
from app.database.connection import get_users_collection

# Load environment variables
load_dotenv()

# Security settings - improved security
# Secret key must be provided in production
SECRET_KEY = getenv("SECRET_KEY")
if not SECRET_KEY:
    if environ.get("ENVIRONMENT") == "production":
        raise ValueError("SECRET_KEY must be set in production environment")
    # Generate a secure random key for development only
    SECRET_KEY = secrets.token_hex(32)
    print("WARNING: Using randomly generated SECRET_KEY. This is for development only!")

ALGORITHM = getenv("ALGORITHM", "HS256")
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
except ValueError:
    print("WARNING: Invalid ACCESS_TOKEN_EXPIRE_MINUTES, using default 30 minutes")
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# File storage path with proper permissions check
UPLOAD_DIRECTORY = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# Check if directory is writable
if not os.access(UPLOAD_DIRECTORY, os.W_OK):
    print(f"WARNING: Upload directory {UPLOAD_DIRECTORY} is not writable!")
    if environ.get("ENVIRONMENT") == "production":
        raise PermissionError(f"Upload directory {UPLOAD_DIRECTORY} must be writable")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("id")
        if username is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(username=username, user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    users_collection = await get_users_collection()
    user = await users_collection.find_one({"_id": ObjectId(token_data.user_id)})
    if user is None:
        raise credentials_exception
    
    # Add default values for missing fields
    if "is_active" not in user:
        user["is_active"] = True
    if "created_at" not in user:
        user["created_at"] = datetime.now(timezone.utc)
    
    user["id"] = str(user["_id"])
    return User(**user) 