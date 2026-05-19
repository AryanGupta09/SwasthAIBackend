/**
 * Environment variables validation
 * Ensures all required environment variables are set
 */

export const validateEnv = () => {
  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "GROQ_API_KEY",
    "PORT"
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  Warning: JWT_SECRET should be at least 32 characters for security");
  }

  console.log("✅ Environment variables validated");
};
