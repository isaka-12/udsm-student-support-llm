# backend/main.py - Using Phi3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import os
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Student Support Assistant - Phi3")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
LLM_MODEL = os.getenv("LLM_MODEL", "phi3")
LLM_API_URL = os.getenv("LLM_API_URL", "http://localhost:11434/api/generate")

# Logging setup
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": LLM_MODEL, "timestamp": time.time()}

@app.post("/ask")
async def ask_question(question_data: dict):
    start_time = time.time()
    
    # Validate input
    if not question_data or "question" not in question_data:
        return JSONResponse(
            status_code=400,
            content={"error": "No question provided"}
        )
    
    user_question = question_data.get("question", "").strip()
    if not user_question:
        return JSONResponse(
            status_code=400,
            content={"error": "Empty question"}
        )
    
    # Improved prompt for Phi3
    SYSTEM_PROMPT = """<|system|>
You are a University Student Support Assistant. Help students with their questions about university services.

University Information:
- Course Registration: Online through student portal, opens 2 weeks before semester
- Examination Rules: 75% attendance required, student ID needed
- Library: Mon-Fri 8am-10pm, Sat 9am-6pm, closed Sunday
- ICT Support: Email helpdesk@university.edu or call extension 1234
- Hostel: Applications open in June, apply through student portal
- Fee Payment: Due at semester start, online or at finance office
- Academic Calendar: September to June, two semesters
- Student Conduct: Follow university code of conduct

Rules:
1. Be helpful, friendly, and professional
2. Provide accurate information based on the context above
3. If unsure, say "I don't have information about that"
4. Keep responses concise and clear
5. Only answer university-related questions
<|/system|>

<|user|>
{question}
<|/user|>

<|assistant|>"""

    prompt = SYSTEM_PROMPT.format(question=user_question)
    
    try:
        # Call Phi3 via Ollama
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                LLM_API_URL,
                json={
                    "model": LLM_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "num_predict": 300
                    }
                }
            )
            
            if response.status_code != 200:
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"LLM error: {response.status_code}"}
                )
            
            result = response.json()
            answer = result.get("response", "").strip()
            
            if not answer:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Empty response from LLM"}
                )
            
            elapsed_time = time.time() - start_time
            
            # Log interaction
            logger.info(f"Question: {user_question[:50]}... | Time: {elapsed_time:.2f}s")
            
            return {
                "answer": answer,
                "model": LLM_MODEL,
                "response_time": elapsed_time,
                "tokens_used": result.get("eval_count", 0)
            }
            
    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content={"error": "LLM request timeout"}
        )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=503,
            content={"error": "Cannot connect to Ollama. Make sure it's running."}
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal error: {str(e)}"}
        )

@app.get("/model-info")
async def model_info():
    return {
        "model": LLM_MODEL,
        "type": "phi3",
        "capabilities": ["text-generation", "chat", "qa"]
    }