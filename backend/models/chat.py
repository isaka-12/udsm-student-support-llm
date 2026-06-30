from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    session_id: str = "default"


class FeedbackRequest(BaseModel):
    session_id: str
    message_index: int
    rating: int      # 1–5
    comment: str = ""
