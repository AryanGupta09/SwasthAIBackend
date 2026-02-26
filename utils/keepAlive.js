/**
 * Keep Render free tier backend awake
 * Pings health endpoint every 10 minutes to prevent sleep
 */

const BACKEND_URL = process.env.BACKEND_URL || "https://swasthaibackend.onrender.com";
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const startKeepAlive = () => {
  // Only run in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('⏭️  Keep-alive disabled in development');
    return;
  }

  console.log('🔄 Keep-alive service started');
  
  setInterval(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      if (response.ok) {
        console.log('✅ Keep-alive ping successful');
      }
    } catch (error) {
      console.error('❌ Keep-alive ping failed:', error.message);
    }
  }, PING_INTERVAL);

  // Initial ping
  setTimeout(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/health`);
      console.log('✅ Initial keep-alive ping sent');
    } catch (error) {
      console.error('❌ Initial ping failed:', error.message);
    }
  }, 5000);
};
