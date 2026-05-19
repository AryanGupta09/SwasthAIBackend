from typing import Optional
from datetime import datetime
from beanie import Document
from bson import ObjectId


class Chat(Document):
    userId: str  # ObjectId as string
    role: str    # "user" or "assistant"
    message: str
    timestamp: datetime = datetime.now()

    class Settings:
        name = "chats"
