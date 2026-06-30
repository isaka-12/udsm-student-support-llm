import os
import warnings
from dotenv import load_dotenv

load_dotenv()

# LLM / Ollama
LLM_MODEL       = os.getenv("LLM_MODEL",    "phi3:latest")
LLM_API_URL     = os.getenv("LLM_API_URL",  "http://localhost:11434/api/chat")
MAX_HISTORY     = int(os.getenv("MAX_HISTORY",     "20"))
CONTEXT_WINDOW  = int(os.getenv("CONTEXT_WINDOW",  "10"))
NUM_CTX         = int(os.getenv("NUM_CTX",         "4096"))
NUM_PREDICT     = int(os.getenv("NUM_PREDICT",      "1000"))
MAX_CONCURRENT  = int(os.getenv("MAX_CONCURRENT",   "3"))
TEMPERATURE     = float(os.getenv("TEMPERATURE",    "0.3"))
TOP_P           = float(os.getenv("TOP_P",          "0.9"))
REPEAT_PENALTY  = float(os.getenv("REPEAT_PENALTY", "1.1"))
CORS_ORIGINS    = os.getenv("CORS_ORIGINS", "*").split(",")
LOG_LEVEL       = os.getenv("LOG_LEVEL", "INFO")

# MongoDB — defaults match mongoDB/docker-compose.yml; override in backend/.env for any other environment
MONGODB_URL      = os.getenv("MONGODB_URL",      "mongodb://admin:password@localhost:27017")
MONGODB_DB       = os.getenv("MONGODB_DB",       "udsm_db")
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "7"))

# JWT
_DEFAULT_SECRET_KEY = "change-me-in-production"
SECRET_KEY                  = os.getenv("SECRET_KEY", _DEFAULT_SECRET_KEY)
ALGORITHM                   = os.getenv("ALGORITHM",  "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

if SECRET_KEY == _DEFAULT_SECRET_KEY:
    warnings.warn(
        "SECRET_KEY is set to the insecure default value. "
        "Set a strong random key in backend/.env before deploying. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\"",
        stacklevel=1,
    )
