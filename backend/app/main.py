from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import predict_router # will create this soon

app = FastAPI(title="StressLens API", version="1.0.0")

# Enable CORS for mobile app development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the StressLens Prediction API"}

# Include routers
# app.include_router(predict_router.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
