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
async def upload(file: UploadFile = File(...)):
    allowed_extensions = ["pdf", "docx", "xlsx", "xls", "pptx", "csv", "txt", "md", "jpg", "jpeg", "png", "webp"]
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed_extensions:
        return {"error": f"Unsupported file type .{ext}"}
    file_path = f"temp_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        chunk_count = ingest_document(file_path, file.filename)
        return {
            "filename": file.filename,
            "chunks_created": chunk_count,
            "message": f"Successfully ingested {file.filename}"
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/upload-bulk")
async def upload_bulk(files: list[UploadFile] = File(...)):
    allowed_extensions = ["pdf", "docx", "xlsx", "xls", "pptx", "csv", "txt", "md", "jpg", "jpeg", "png", "webp"]
    results = []
    errors = []
    total_chunks = 0

    for file in files:
        ext = file.filename.lower().split(".")[-1]
        if ext not in allowed_extensions:
            errors.append(f"Skipped {file.filename}")
            continue
        file_path = f"temp_{file.filename}"
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            chunk_count = ingest_document(file_path, file.filename)
            total_chunks += chunk_count
            results.append({"filename": file.filename, "chunks": chunk_count})
        except Exception as e:
            errors.append(f"Failed {file.filename}: {str(e)}")
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    return {
        "message": f"Bulk upload complete! {len(results)} files ingested.",
        "total_chunks": total_chunks,
        "files_ingested": len(results),
        "errors": errors
    }
@app.post("/upload-bulk")
async def upload_bulk(files: list[UploadFile] = File(...)):
    """Accept multiple documents at once and ingest all into RAG pipeline"""
    allowed_extensions = ["pdf", "docx", "xlsx", "xls", "pptx", "csv", "txt", "md", "jpg", "jpeg", "png", "webp"]
    
    results = []
    errors = []
    total_chunks = 0

    for file in files:
        ext = file.filename.lower().split(".")[-1]
        if ext not in allowed_extensions:
            errors.append(f"Skipped {file.filename} — unsupported type .{ext}")
            continue
        
        file_path = f"temp_{file.filename}"
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            chunk_count = ingest_document(file_path, file.filename)
            total_chunks += chunk_count
            results.append({"filename": file.filename, "chunks": chunk_count})
        except Exception as e:
            errors.append(f"Failed {file.filename}: {str(e)}")
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    return {
        "message": f"Bulk upload complete! {len(results)} files ingested.",
        "total_chunks": total_chunks,
        "files_ingested": len(results),
        "files_failed": len(errors),
        "results": results,
        "errors": errors
    }
@app.post("/ask")
async def ask(request: QuestionRequest):
    """Accept a question and return RAG answer"""
    result = ask_question(request.question)
    return result

@app.get("/documents")
async def list_documents():
    """Return list of all uploaded documents"""
    docs = get_uploaded_documents()
    return {"documents": docs, "count": len(docs)}

@app.post("/clear")
async def clear():
    """Clear all documents and reset"""
    clear_documents()
    return {"message": "All documents cleared successfully"}