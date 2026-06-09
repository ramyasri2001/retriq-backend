from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv
import os

load_dotenv()

# Global variables — shared across requests
vectorstore = None
rag_chain = None

# Initialize embedding model once — expensive to reload every time
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_key=os.getenv("OPENAI_API_KEY")
)
# Initialize Claude once
llm = ChatAnthropic(
    model="claude-opus-4-6",
    anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
    max_tokens=1024
)

def ingest_pdf(file_path: str):
    """Read PDF, chunk it, embed it, store in FAISS"""
    global vectorstore, rag_chain

    # Load PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(documents)

    # Store in FAISS
    vectorstore = FAISS.from_documents(chunks, embeddings)

    # Create RAG chain
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    rag_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )

    return len(chunks)

def ask_question(question: str):
    """Ask a question and get answer from RAG pipeline"""
    global rag_chain

    if rag_chain is None:
        return {"error": "No document uploaded yet. Please upload a PDF first."}

    result = rag_chain.invoke({"query": question})

    return {
        "answer": result["result"],
        "sources": len(result["source_documents"])
    }