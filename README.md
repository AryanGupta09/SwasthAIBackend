# FitAI Backend

Backend API for FitAI - An AI-powered fitness and nutrition application.

## Features

- User authentication (register/login) with JWT
- AI-powered diet plan generation using Groq
- AI fitness coach chatbot
- Health monitoring and BMI tracking
- Rate limiting and security middleware
- Request logging and error handling

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Groq AI API
- bcryptjs for password hashing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (use `.env.example` as template):
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
   - MongoDB connection string
   - JWT secret (at least 32 characters)
   - Groq API key

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Diet (Protected)
- `POST /api/diet/generate` - Generate personalized diet plan

### Chat (Protected)
- `POST /api/chat/send` - Chat with AI fitness coach

### Health
- `GET /api/health` - API health check
- `GET /api/docs` - API documentation

## Security Features

- Input validation on all endpoints
- Rate limiting (100 requests per 15 minutes)
- JWT token authentication
- Password hashing with bcrypt
- Environment variable validation
- Global error handling

## Project Structure

```
Backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── utils/           # Utility functions
└── server.js        # Entry point
```

## Development

The server includes:
- Request logging for debugging
- Automatic reconnection to MongoDB
- Graceful error handling
- Environment validation on startup

## License

ISC
