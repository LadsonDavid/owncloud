import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from os import getenv
from dotenv import load_dotenv

from app.routers import auth, files
from app.database.connection import get_database

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_database()
    yield


app = FastAPI(
    title="Cloud Storage API",
    description="A FastAPI backend for a cloud storage system with user authentication and file management.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

production_domain = getenv("PRODUCTION_DOMAIN")
if production_domain:
    origins.append(f"https://{production_domain}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["*"],
    max_age=600,
)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.url.path == "/upload":
        content_length = request.headers.get("content-length")
        max_size = 10 * 1024 * 1024  # 10 MB
        if content_length and int(content_length) > max_size:
            return JSONResponse(
                status_code=413,
                content={"detail": "File too large. Maximum size is 10MB."},
            )
    return await call_next(request)


app.include_router(auth.router)
app.include_router(files.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Cloud Storage API",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/test")
async def test():
    return {"status": "ok", "message": "Backend server is running correctly"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
