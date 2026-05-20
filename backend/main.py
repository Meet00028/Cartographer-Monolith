import os
import json
import asyncio
import re
import shutil
import tempfile
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import AsyncGroq
from git import Repo

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

def extract_imports(content: str, file_path: str) -> List[str]:
    imports = []
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext in ['.js', '.jsx', '.ts', '.tsx']:
        # JS/TS imports: import ... from 'path' or require('path')
        js_patterns = [
            r"import\s+.*\s+from\s+['\"](.*?)['\"]",
            r"require\(['\"](.*?)['\"]\)",
            r"import\(['\"](.*?)['\"]\)"
        ]
        for pattern in js_patterns:
            matches = re.findall(pattern, content)
            imports.extend(matches)
            
    elif ext == '.py':
        # Python imports: import path or from path import ...
        py_patterns = [
            r"^import\s+([a-zA-Z0-9_\.]+)",
            r"^from\s+([a-zA-Z0-9_\.]+)\s+import"
        ]
        for pattern in py_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            imports.extend(matches)
            
    return imports

def resolve_path(import_path: str, current_file: str, all_files: List[str]) -> str:
    if import_path.startswith('.'):
        # Relative path
        dir_name = os.path.dirname(current_file)
        target = os.path.normpath(os.path.join(dir_name, import_path))
        
        # Try matching with extensions
        for ext in ['', '.js', '.jsx', '.ts', '.tsx', '.py']:
            if target + ext in all_files:
                return target + ext
            # Check for index files
            if os.path.join(target, f"index{ext}") in all_files:
                return os.path.join(target, f"index{ext}")
    else:
        # Absolute or module path - try to match with project files
        for f in all_files:
            if f.endswith(import_path) or f.endswith(import_path.replace('.', '/') + '.py'):
                return f
    return ""

def parse_config(content: str, file_path: str) -> Dict[str, Any]:
    ext = os.path.splitext(file_path)[1].lower()
    name = os.path.basename(file_path).lower()
    metadata = {}
    
    if name == 'package.json':
        try:
            data = json.loads(content)
            metadata['name'] = data.get('name', 'unknown')
            metadata['deps'] = len(data.get('dependencies', {})) + len(data.get('devDependencies', {}))
            metadata['scripts'] = list(data.get('scripts', {}).keys())
        except: pass
    elif name == 'requirements.txt':
        lines = [l for l in content.split('\n') if l.strip() and not l.startswith('#')]
        metadata['packages'] = len(lines)
    elif name == '.env':
        keys = []
        for line in content.split('\n'):
            if '=' in line and not line.startswith('#'):
                keys.append(line.split('=')[0].strip())
        metadata['keys'] = keys
    return metadata

@app.post("/api/parse-stream")
async def parse_stream(files: List[UploadFile] = File(...)):
    async def event_generator():
        ignore_patterns = ['node_modules', '.git', '__pycache__', 'dist', 'build', '.DS_Store']
        total_files = len(files)
        file_contents = {}
        all_file_paths = []
        ignored_count = 0
        
        # First pass: read all files
        for i, file in enumerate(files):
            path = file.filename
            if any(p in path for p in ignore_patterns):
                ignored_count += 1
                continue
                
            content = await file.read()
            content_str = content.decode('utf-8', errors='ignore')
            file_contents[path] = content_str
            all_file_paths.append(path)
            
            yield f"data: {json.dumps({'status': 'parsing', 'file': path, 'current': i + 1, 'total': total_files, 'ignored': ignored_count})}\n\n"
            await asyncio.sleep(0.01)

        # Second pass: extract dependency edges and metadata
        dependency_edges = []
        file_metadata = {}
        for path, content in file_contents.items():
            # Dependencies
            imports = extract_imports(content, path)
            for imp in imports:
                resolved = resolve_path(imp, path, all_file_paths)
                if resolved and resolved != path:
                    dependency_edges.append({
                        "source": path,
                        "target": resolved,
                        "type": "import"
                    })
            
            # Config metadata
            meta = parse_config(content, path)
            if meta:
                file_metadata[path] = meta

        yield f"data: {json.dumps({'status': 'complete', 'dependency_edges': dependency_edges, 'metadata': file_metadata, 'ignored_count': ignored_count})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/parse-github")
async def parse_github(repo_url: str):
    temp_dir = tempfile.mkdtemp()
    try:
        Repo.clone_from(repo_url, temp_dir, depth=1)
        
        ignore_patterns = ['node_modules', '.git', '__pycache__', 'dist', 'build', '.DS_Store']
        all_files = []
        file_contents = {}
        ignored_count = 0
        
        for root, dirs, files in os.walk(temp_dir):
            if any(p in root for p in ignore_patterns):
                ignored_count += len(files)
                continue
                
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, temp_dir)
                
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        file_contents[rel_path] = content
                        all_files.append(rel_path)
                except:
                    ignored_count += 1
                    continue

        dependency_edges = []
        file_metadata = {}
        for path, content in file_contents.items():
            imports = extract_imports(content, path)
            for imp in imports:
                resolved = resolve_path(imp, path, all_files)
                if resolved and resolved != path:
                    dependency_edges.append({
                        "source": path,
                        "target": resolved,
                        "type": "import"
                    })
            
            meta = parse_config(content, path)
            if meta:
                file_metadata[path] = meta

        return {
            "status": "complete",
            "files": [{"path": k, "content": v} for k, v in file_contents.items()],
            "dependency_edges": dependency_edges,
            "metadata": file_metadata,
            "ignored_count": ignored_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

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