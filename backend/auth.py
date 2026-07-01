import asyncio
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from backend.database.database import get_user
from backend.logs.logs import logger

pwd_context     = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme   = HTTPBearer()
_optional_scheme = HTTPBearer(auto_error=False)


async def hash_password(password: str) -> str:
    # bcrypt is CPU-bound (~100-300ms); off the event loop so it doesn't
    # stall other requests (e.g. in-flight SSE streams) while it runs.
    return await asyncio.to_thread(pwd_context.hash, password)


async def verify_password(plain: str, hashed: str) -> bool:
    return await asyncio.to_thread(pwd_context.verify, plain, hashed)


def create_access_token(email: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc

    user = await get_user(email)
    if not user:
        raise exc

    return {
        "email":      user["email"],
        "first_name": user.get("first_name", ""),
        "last_name":  user.get("last_name", ""),
    }


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_scheme),
) -> dict | None:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
            return None
        user = await get_user(email)
        if not user:
            return None
        return {"email": user["email"]}
    except JWTError:
        return None
    except Exception as exc:
        # Auth is optional here (unlike get_current_user) — a transient
        # DB hiccup (e.g. Mongo briefly unreachable/slow) should degrade
        # to an anonymous request, not take down the whole /ask call.
        logger.warning("get_optional_user: treating as anonymous after error: %s", exc)
        return None
