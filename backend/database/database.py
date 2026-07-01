from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ReturnDocument
from backend.config import MONGODB_URL, MONGODB_DB, SESSION_TTL_DAYS, MAX_HISTORY

_client: AsyncIOMotorClient | None = None


# ── Connection ─────────────────────────────────────────────────────────────────

def get_db() -> AsyncIOMotorDatabase:
    return _client[MONGODB_DB]


async def connect_db() -> None:
    global _client
    _client = AsyncIOMotorClient(MONGODB_URL)
    db = get_db()
    await db.sessions.create_index("session_id", unique=True)
    await db.sessions.create_index("last_used", expireAfterSeconds=SESSION_TTL_DAYS * 86_400)
    await db.sessions.create_index("user_email")
    await db.users.create_index("email", unique=True)


async def close_db() -> None:
    if _client:
        _client.close()


# ── Session / chat history ─────────────────────────────────────────────────────

async def get_session_messages(session_id: str) -> list[dict]:
    db = get_db()
    doc = await db.sessions.find_one({"session_id": session_id}, {"_id": 0, "messages": 1})
    return doc["messages"] if doc else []


async def append_message(
    session_id: str, role: str, content: str,
    user_email: str | None = None, **meta
) -> None:
    db = get_db()
    msg = {
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat(),
        **meta,
    }
    update: dict = {
        "$push": {"messages": {"$each": [msg], "$slice": -MAX_HISTORY}},
        "$set": {"last_used": datetime.utcnow()},
    }
    if user_email:
        update["$set"]["user_email"] = user_email
    await db.sessions.update_one(
        {"session_id": session_id},
        update,
        upsert=True,
    )


async def append_user_message_and_get_history(
    session_id: str, question: str, user_email: str | None = None
) -> tuple[list[dict], bool]:
    """
    Appends the user's question and returns (updated_history, is_first_message)
    in a single round-trip, instead of count + append + re-fetch.
    """
    db = get_db()
    msg = {
        "role": "user",
        "content": question,
        "timestamp": datetime.utcnow().isoformat(),
    }
    update: dict = {
        "$push": {"messages": {"$each": [msg], "$slice": -MAX_HISTORY}},
        "$set": {"last_used": datetime.utcnow()},
    }
    if user_email:
        update["$set"]["user_email"] = user_email
    doc = await db.sessions.find_one_and_update(
        {"session_id": session_id},
        update,
        upsert=True,
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0, "messages": 1},
    )
    history = doc["messages"]
    return history, len(history) == 1


async def update_message_feedback(
    session_id: str, message_index: int, feedback: dict
) -> bool:
    db = get_db()
    field = f"messages.{message_index}.feedback"
    result = await db.sessions.update_one(
        {"session_id": session_id},
        {"$set": {field: feedback}},
    )
    return result.matched_count > 0


async def get_session_message_count(session_id: str) -> int:
    db = get_db()
    doc = await db.sessions.find_one({"session_id": session_id}, {"_id": 0, "messages": 1})
    return len(doc["messages"]) if doc else 0


async def clear_session(session_id: str) -> None:
    db = get_db()
    await db.sessions.delete_one({"session_id": session_id})


async def clear_all_sessions() -> int:
    db = get_db()
    result = await db.sessions.delete_many({})
    return result.deleted_count


async def set_session_title(session_id: str, title: str) -> None:
    db = get_db()
    await db.sessions.update_one(
        {"session_id": session_id, "title": {"$exists": False}},
        {"$set": {"title": title}},
    )


async def list_sessions(user_email: str | None = None) -> list[dict]:
    db = get_db()
    match: dict = {}
    if user_email:
        match["user_email"] = user_email
    pipeline = [
        {"$match": match},
        {"$addFields": {
            "message_count": {"$size": "$messages"},
            "first_user_content": {
                "$let": {
                    "vars": {
                        "fm": {
                            "$first": {
                                "$filter": {
                                    "input": "$messages",
                                    "cond": {"$eq": ["$$this.role", "user"]},
                                }
                            }
                        }
                    },
                    "in": {"$ifNull": ["$$fm.content", ""]},
                }
            },
        }},
        {"$project": {
            "_id": 0,
            "session_id": 1,
            "last_used": 1,
            "message_count": 1,
            "title": {
                "$ifNull": [
                    "$title",
                    {
                        "$cond": {
                            "if": {"$gt": [{"$strLenCP": "$first_user_content"}, 0]},
                            "then": {"$substrCP": ["$first_user_content", 0, 50]},
                            "else": "New conversation",
                        }
                    },
                ]
            },
        }},
        {"$sort": {"last_used": -1}},
        {"$limit": 50},
    ]
    return await db.sessions.aggregate(pipeline).to_list(None)


# ── Users ──────────────────────────────────────────────────────────────────────

async def create_user(
    email: str, hashed_password: str, first_name: str, last_name: str
) -> None:
    db = get_db()
    await db.users.insert_one({
        "email": email,
        "hashed_password": hashed_password,
        "first_name": first_name,
        "last_name": last_name,
        "created_at": datetime.utcnow(),
    })


async def get_user(email: str) -> dict | None:
    db = get_db()
    return await db.users.find_one({"email": email}, {"_id": 0})


# ── Feedback ───────────────────────────────────────────────────────────────────

async def save_feedback(
    session_id: str, message_index: int, rating: int, comment: str
) -> None:
    db = get_db()
    await db.feedback.insert_one({
        "session_id": session_id,
        "message_index": message_index,
        "rating": rating,
        "comment": comment,
        "submitted_at": datetime.utcnow(),
    })
