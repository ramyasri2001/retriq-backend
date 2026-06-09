from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import sys
sys.path.append(os.path.dirname(__file__))
from rag_pipeline import ingest_pdf, ask_question
app = FastAPI()

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model for /ask endpoint
class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"message": "Compliance RAG Assistant is running!"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Accept a PDF and ingest it into RAG pipeline"""
    
    # Check file type
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files are supported. Please upload a .pdf file."}
    
    # Save uploaded file temporarily
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Ingest into RAG pipeline
    chunk_count = ingest_pdf(file_path)
    
    # Clean up temp file
    os.remove(file_path)
    
    return {
        "message": f"PDF ingested successfully!",
        "chunks_created": chunk_count,
        "filename": file.filename
    }
@app.post("/ask")
async def ask(request: QuestionRequest):
    """Accept a question and return RAG answer"""
    result = ask_question(request.question)
    return result