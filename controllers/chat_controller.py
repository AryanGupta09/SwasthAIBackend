import os
from fastapi import HTTPException
from pydantic import BaseModel
from groq import Groq
from models.chat import Chat
from dotenv import load_dotenv

load_dotenv()


# ================= REQUEST SCHEMAS =================

class SendMessageRequest(BaseModel):
    message: str


# ================= SEND MESSAGE =================

async def send_message(data: SendMessageRequest, user_id: str):
    try:
        if not data.message or not data.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        # Last 10 messages fetch karo context ke liye
        previous_chats = await Chat.find(
            Chat.userId == user_id
        ).sort(-Chat.timestamp).limit(10).to_list()

        # Chronological order mein reverse karo
        previous_chats.reverse()

        # Conversation history build karo
        conversation_history = [
            {
                "role": "system",
                "content": """You are an expert Indian fitness and nutrition coach named "SwasthAI Coach". 
        
Your expertise includes:
- Indian diet and nutrition
- Fitness and exercise guidance
- Health management for Indian lifestyle
- Ayurvedic wellness tips

Guidelines:
- Give practical, actionable advice
- Use Indian food examples (roti, dal, sabzi, etc.)
- Keep responses concise (2-3 sentences for simple queries)
- Be encouraging and motivating
- Suggest Indian home remedies when appropriate
- Always prioritize safety - suggest doctor consultation for serious issues
- Remember previous conversation context and refer to it when relevant"""
            }
        ]

        for chat in previous_chats:
            conversation_history.append({
                "role": "user" if chat.role == "user" else "assistant",
                "content": chat.message
            })

        conversation_history.append({
            "role": "user",
            "content": data.message
        })

        # Groq API call
        chat_completion = groq_client.chat.completions.create(
            messages=conversation_history,
            model="llama-3.3-70b-versatile",
            temperature=0.8,
            max_tokens=500,
        )

        reply = chat_completion.choices[0].message.content or "Sorry, I couldn't generate a response. Please try again."

        # User message save karo
        await Chat(
            userId=user_id,
            role="user",
            message=data.message.strip()
        ).insert()

        # AI response save karo
        await Chat(
            userId=user_id,
            role="assistant",
            message=reply.strip()
        ).insert()

        return {"success": True, "reply": reply.strip()}

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "API key" in error_msg:
            raise HTTPException(status_code=401, detail="API configuration error. Please contact support.")
        raise HTTPException(status_code=500, detail=f"Chat service temporarily unavailable: {error_msg}")


# ================= GET CHAT HISTORY =================

async def get_chat_history(user_id: str):
    try:
        chats = await Chat.find(
            Chat.userId == user_id
        ).sort(+Chat.timestamp).limit(50).to_list()

        chats_data = []
        for chat in chats:
            c = chat.dict()
            c["_id"] = str(chat.id)
            chats_data.append(c)

        return {"success": True, "chats": chats_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {str(e)}")


# ================= CLEAR CHAT HISTORY =================

async def clear_chat_history(user_id: str):
    try:
        await Chat.find(Chat.userId == user_id).delete()
        return {"success": True, "message": "Chat history cleared successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {str(e)}")
