from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from config import settings
from database import Base, engine
from routers import chat, evaluations, logs, metrics, models_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LLM Observatory API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(logs.router)
app.include_router(metrics.router)
app.include_router(models_router.router)
app.include_router(evaluations.router)


@app.get("/")
def root():
    return {"message": "LLM Observatory API is running"}
