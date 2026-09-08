from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "LLM Observatory API is running"}