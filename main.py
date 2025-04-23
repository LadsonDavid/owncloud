import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from os import getenv
from dotenv import load_dotenv

from app.routers import auth, files
from app.database.connection import get_database

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Cloud Storage API",
    description="A FastAPI backend for a cloud storage system with user authentication and file management.",
    version="1.0.0",
)

# Configure CORS - more restrictive for production
origins = [
    "http://localhost:3000",  # React development server
    "http://127.0.0.1:3000",
]

# Add production domain if available
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
        "X-Requested-With"
    ],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Add request size limit middleware for file uploads
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.url.path == "/upload":
        content_length = request.headers.get("content-length")
        max_size = 10 * 1024 * 1024  # 10 MB limit
        if content_length and int(content_length) > max_size:
            return JSONResponse(
                status_code=413,
                content={"detail": "File too large. Maximum size is 10MB."}
            )
    return await call_next(request)

# Add CORS middleware for handling preflight requests and adding headers
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    # Handle OPTIONS requests
    if request.method == "OPTIONS":
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
        response.headers["Access-Control-Max-Age"] = "600"
    
    return response

# Include routers
app.include_router(auth.router)
app.include_router(files.router)

# Add startup event to initialize database connection
@app.on_event("startup")
async def startup_db_client():
    await get_database()

@app.get("/")
async def root():
    return {
        "message": "Welcome to Cloud Storage API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/test")
async def test():
    return {
        "status": "ok",
        "message": "Backend server is running correctly"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 