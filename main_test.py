import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Test API",
    description="A test API to check connectivity",
    version="1.0.0",
)

# Configure CORS
origins = [
    "http://localhost:3000",  # React development server
    "http://127.0.0.1:3000",
    "*"  # Allow all origins for testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

@app.get("/")
async def root():
    return {
        "message": "Test API is working",
        "status": "ok"
    }

@app.get("/test")
async def test():
    return {
        "message": "You can connect to the backend!",
        "status": "success"
    }

if __name__ == "__main__":
    uvicorn.run("main_test:app", host="0.0.0.0", port=8000, reload=True)
