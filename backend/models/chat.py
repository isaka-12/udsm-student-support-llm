from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    session_id: str = "default"
    model: str | None = None          # override LLM_MODEL for this request
    file_context: str | None = None   # extracted text from an uploaded file


class FeedbackRequest(BaseModel):
    session_id: str
    message_index: int
    rating: int      # 1–5
    comment: str = ""
