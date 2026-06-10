from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv
import os
import sys

sys.path.append(os.path.dirname(__file__))
load_dotenv()

# Global variables
vectorstore = None
rag_chain = None

# Initialize embedding model once
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize Claude once
llm = ChatAnthropic(
    model="claude-opus-4-6",
    anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
    max_tokens=1024
)

def ingest_pdf(file_path: str):
    """Read PDF, chunk it, embed it, store in FAISS"""
    global vectorstore, rag_chain

    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(documents)

    vectorstore = FAISS.from_documents(chunks, embeddings)

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    rag_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )

    return len(chunks)

def ask_question(question: str):
    """Ask a question — FAISS first, Tavily fallback"""
    global rag_chain, vectorstore

    if rag_chain is None:
        return {"error": "No document uploaded yet. Please upload a PDF first."}

    # Step 1 — Search FAISS first
    result = rag_chain.invoke({"query": question})
    answer = result["result"]
    sources = len(result["source_documents"])

    # Step 2 — Check if FAISS found relevant answer
    no_answer_phrases = [
        "i don't have", "i do not have", "not mentioned",
        "no information", "not found", "cannot find",
        "not provided", "not available", "don't know"
    ]

    faiss_failed = any(phrase in answer.lower() for phrase in no_answer_phrases)

    # Step 3 — Tavily fallback if FAISS failed
    if faiss_failed:
        try:
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
            search_results = tavily.search(query=question, max_results=3)

            # Build context from Tavily results
            web_context = "\n\n".join([
                f"Source: {r['url']}\n{r['content']}"
                for r in search_results.get("results", [])
            ])

            # Ask Claude with web context
            from anthropic import Anthropic
            client = Anthropic()
            web_answer = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": f"Answer this question using the web sources below:\n\n{web_context}\n\nQuestion: {question}"
                }]
            )

            return {
                "answer": web_answer.content[0].text,
                "sources": len(search_results.get("results", [])),
                "source_type": "web"
            }
        except Exception as e:
            pass

    return {
        "answer": answer,
        "sources": sources,
        "source_type": "document"
    }