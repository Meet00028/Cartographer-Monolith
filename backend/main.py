import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import AsyncGroq

# Load environment variables
load_dotenv()

# Configure Groq (ASYNC ENGINE)
api_key = os.getenv("GROQ_API_KEY")
client = AsyncGroq(api_key=api_key) if api_key else None

app = FastAPI()

# --- CORS GATEWAY ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------

class SummarizeRequest(BaseModel):
    file_name: str
    code_content: str

class SummarizeResponse(BaseModel):
    summary: str

class ChatRequest(BaseModel):
    file_name: str
    code_content: str
    prompt: str

class FileSummary(BaseModel):
    file_name: str
    summary: str

class GenerateDocsRequest(BaseModel):
    summaries: list[FileSummary]

class GenerateDocsResponse(BaseModel):
    markdown: str

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_code(request: SummarizeRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from .env")
    
    try:
        prompt = f"""
        Analyze the following code from the file '{request.file_name}'.
        Provide a concise, high-level summary of what this code does, its main components, and its purpose in the architecture.
        Keep the tone professional, architectural, and brief.
        
        Code:
        ```
        {request.code_content}
        ```
        """
        
        # AWAIT the async completion
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        
        return SummarizeResponse(summary=chat_completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-docs", response_model=GenerateDocsResponse)
async def generate_docs(request: GenerateDocsRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from .env")
    
    try:
        summaries_str = "\n".join([f"File: {s.file_name}\nSummary: {s.summary}" for s in request.summaries])
        
        prompt = f"""
        You are a Principal Software Architect. I will provide you with a list of files and their individual summaries. 
        Your task is to write a cohesive, professional ARCHITECTURE.md file. 
        Include sections for: Executive Summary, System Flow, Tech Stack Analysis, and Component Relationships. 
        Format it in clean Markdown.

        File Summaries:
        {summaries_str}
        """
        
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        
        return GenerateDocsResponse(markdown=chat_completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=SummarizeResponse)
async def chat_code(request: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing from .env")
    
    try:
        prompt = f"""
        Context File: '{request.file_name}'
        Code:
        ```
        {request.code_content}
        ```
        User Query: {request.prompt}
        """
        
        # AWAIT the async completion
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an elite Senior Developer AI pairing with the user. Provide concise, highly technical responses focusing on architecture, optimization, and exact answers."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
        )
        
        return SummarizeResponse(summary=chat_completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))