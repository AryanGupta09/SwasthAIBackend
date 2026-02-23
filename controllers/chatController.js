import Groq from "groq-sdk";

export const sendMessage = async (req, res) => {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty"
      });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
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
- Always prioritize safety - suggest doctor consultation for serious issues`
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";

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