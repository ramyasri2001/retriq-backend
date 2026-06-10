from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import sys
sys.path.append(os.path.dirname(__file__))
from rag_pipeline import ingest_document, ask_question, get_uploaded_documents, clear_documents
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
async def upload_document(file: UploadFile = File(...)):
    """Accept any document and ingest it into RAG pipeline"""
    
    # Check supported file types
    allowed_extensions = ["pdf", "docx", "xlsx", "xls", "pptx", "csv", "txt", "md", "jpg", "jpeg", "png", "webp"]
    ext = file.filename.lower().split(".")[-1]
    
    if ext not in allowed_extensions:
        return {"error": f"Unsupported file type .{ext}. Supported: {', '.join(allowed_extensions)}"}
    
    # Save uploaded file temporarily
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Ingest into RAG pipeline
    chunk_count = ingest_document(file_path, file.filename)
    
    # Clean up temp file
    os.remove(file_path)
    
    return {
        "message": f"Document ingested successfully!",
        "chunks_created": chunk_count,
        "filename": file.filename
    }

@app.post("/ask")
async def ask(request: QuestionRequest):
    """Accept a question and return RAG answer"""
    result = ask_question(request.question)
    return result