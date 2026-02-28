import { server } from "./index.js";
import db from "./db.js";

// allow overriding the port via environment (useful for deployment or multiple local services)
// avoid colliding with the database port variable, so the HTTP port prefers
// SERVER_PORT before falling back to generic PORT.
export const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// Start server (ONLY PLACE where listen is called)
server.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}/chat`);
});

// connect to database (best effort)
db.connect().catch(err => console.warn('DB connect warning:', err.message || err));