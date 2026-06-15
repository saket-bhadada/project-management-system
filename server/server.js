import { server } from "./index.js";
import db, { initSchema } from "./db.js";

// allow overriding the port via environment (useful for deployment or multiple local services)
// avoid colliding with the database port variable, so the HTTP port prefers
// SERVER_PORT before falling back to generic PORT.  default is 3000 so it doesn’t
// conflict with the React development server.
export const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// Start server (ONLY PLACE where listen is called)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process running on this port.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}/chat`);
});

// connect to database (best effort)
console.log('Connecting to database...');
const MAX_DB_RETRIES = 5;
const DB_RETRY_DELAY_MS = 3000;

async function connectWithRetry(retries = MAX_DB_RETRIES) {
  console.log('DB connect params:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
  });
  try {
    const client = await db.connect();
    client.release();
    console.log('Database connected successfully.');
    try {
      await initSchema();
    } catch (err) {
      console.error('DB schema init error:', err.message || err);
    }
  } catch (err) {
    console.error('DB connect failed:', err.message || err);
    if (retries > 0) {
      console.log(`Retrying database connection in ${DB_RETRY_DELAY_MS}ms... (${retries} retries left)`);
      setTimeout(() => connectWithRetry(retries - 1), DB_RETRY_DELAY_MS);
    } else {
      console.error('CRITICAL: DB connect failed after retries.');
      console.error('Check your .env variables (DB_USER, DB_HOST, DB_PASSWORD, etc.)');
    }
  }
}

connectWithRetry();