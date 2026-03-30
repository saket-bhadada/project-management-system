import { WebSocketServer } from "ws";

export default function setupChat(server) {
  // Use the same server instance and map the WebSocket to a specific path
  const wss = new WebSocketServer({ server, path: "/chat" });

  wss.on("connection", (ws, req) => {
    // Optionally parse username from the connection URL
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const username = reqUrl.searchParams.get("username") || "Anonymous";
    
    console.log(`WebSocket connection established for ${username}`);
    
    ws.on("message", (message) => {
      console.log(`Received message from ${username}: ${message}`);
      
      const messageString = message.toString();
      // Broadcast the message to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(messageString);
        }
      });
    });

    ws.on("close", () => {
      console.log(`WebSocket connection closed for ${username}`);
    });
    
    ws.on("error", (error) => {
      console.error(`WebSocket error for ${username}:`, error);
    });
  });
}
