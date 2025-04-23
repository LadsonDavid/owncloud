import motor.motor_asyncio
import asyncio
from os import getenv
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# MongoDB connection settings
MONGODB_URL = getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = getenv("DATABASE_NAME", "localserver")

# Create a global client variable
client = None
db = None

# Create a function to get the database client
async def get_database():
    global client, db
    
    # If client already exists, return the database
    if client is not None:
        return db
        
    # Create a new client if one doesn't exist
    client = motor.motor_asyncio.AsyncIOMotorClient(
        MONGODB_URL,
        maxPoolSize=10,
        minPoolSize=1,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )
    
    try:
        # Verify connection is working
        await client.admin.command('ping')
        print(f"Connected to MongoDB: {DATABASE_NAME}")
        db = client[DATABASE_NAME]
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        print("Make sure MongoDB is running and connection details are correct")
        # Graceful exit or fallback mechanism in production
        if getenv("ENVIRONMENT") == "production":
            sys.exit(1)
    
    return db

# Create asynchronous database access functions
async def get_users_collection():
    db = await get_database()
    return db.users

async def get_files_collection():
    db = await get_database()
    return db.files

async def get_folders_collection():
    db = await get_database()
    return db.folders 