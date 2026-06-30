from typing import TypedDict
from datetime import datetime


class MessageDoc(TypedDict):
    role: str
    content: str
    timestamp: str


class SessionDoc(TypedDict):
    session_id: str
    messages: list[MessageDoc]
    last_used: datetime


class UserDoc(TypedDict):
    email: str
    hashed_password: str
    created_at: datetime


class FeedbackDoc(TypedDict):
    session_id: str
    message_index: int
    rating: int
    comment: str
    submitted_at: datetime
