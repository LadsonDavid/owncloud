import motor.motor_asyncio
import sys
from os import getenv
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = getenv("DATABASE_NAME", "localserver")

client = None
db = None


async def get_database():
    global client, db

    if client is not None:
        return db

    client = motor.motor_asyncio.AsyncIOMotorClient(
        MONGODB_URL,
        maxPoolSize=10,
        minPoolSize=1,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )

    try:
        await client.admin.command("ping")
        print(f"Connected to MongoDB: {DATABASE_NAME}")
        db = client[DATABASE_NAME]
        await _create_indexes(db)
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        print("Make sure MongoDB is running and connection details are correct")
        if getenv("ENVIRONMENT") == "production":
            sys.exit(1)

    return db


async def _create_indexes(db):
    await db.users.create_index("username", unique=True, background=True)
    await db.users.create_index("email", unique=True, background=True)
    await db.files.create_index("user_id", background=True)
    await db.files.create_index([("user_id", 1), ("folder_id", 1)], background=True)
    await db.folders.create_index("user_id", background=True)
    await db.folders.create_index([("user_id", 1), ("parent_id", 1)], background=True)


async def get_users_collection():
    db = await get_database()
    return db.users


async def get_files_collection():
    db = await get_database()
    return db.files


async def get_folders_collection():
    db = await get_database()
    return db.folders
