import Groq from "groq-sdk";
import Chat from "../models/Chat.js";

export const sendMessage = async (req, res) => {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const { message } = req.body;
    const userId = req.userId;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty"
      });
    }

    // Get previous chat history (last 10 messages for context)
    const previousChats = await Chat.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Reverse to get chronological order
    previousChats.reverse();

    // Build conversation history for AI
    const conversationHistory = [
      {
        role: "system",
        content: `You are an expert Indian fitness and nutrition coach named "SwasthAI Coach". 
        
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
- Remember previous conversation context and refer to it when relevant`
      }
    ];

    // Add previous chat history
    previousChats.forEach(chat => {
      conversationHistory.push({
        role: chat.role === "user" ? "user" : "assistant",
        content: chat.message
      });
    });

    // Add current user message
    conversationHistory.push({
      role: "user",
      content: message
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: conversationHistory,
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";

    // Save user message to database
    await Chat.create({
      userId,
      role: "user",
      message: message.trim()
    });

    // Save AI response to database
    await Chat.create({
      userId,
      role: "assistant",
      message: reply.trim()
    });

    res.status(200).json({
      success: true,
      reply: reply.trim()
    });

  } catch (error) {
    console.error("Chat Error:", error.message);
    
    // Handle specific Groq errors
    if (error.message.includes("API key")) {
      return res.status(401).json({
        success: false,
        message: "API configuration error. Please contact support.",
        error: "Invalid API credentials"
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Chat service temporarily unavailable",
      error: error.message 
    });
  }
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    
    const chats = await Chat.find({ userId })
      .sort({ timestamp: 1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      chats
    });

  } catch (error) {
    console.error("Get Chat History Error:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch chat history",
      error: error.message 
    });
  }
};

// Clear chat history
export const clearChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    
    await Chat.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: "Chat history cleared successfully"
    });

  } catch (error) {
    console.error("Clear Chat History Error:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to clear chat history",
      error: error.message 
    });
  }
};