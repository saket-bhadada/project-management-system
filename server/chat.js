import { createServer } from "http";
import { WebSocketServer } from "ws";
import url from "url";

// Simple WebSocket server for raw WebSocket clients.
// Listens on port 3001 and accepts connections on path `/chat`.
const server = createServer();

const wss = new WebSocketServer({ server, path: "/chat" });

wss.on("connection", (ws, req) => {
    const { username } = url.parse(req.url || "", true).query || {};
    console.log("WebSocket connected; username=", username);

    ws.on("message", (message) => {
        const text = message.toString();
        console.log("received:", text);
        // Echo the message back for now
        ws.send(`Echo: ${text}`);
    });

    ws.on("close", () => console.log("WebSocket closed"));
    ws.on("error", (err) => console.error("WebSocket error:", err));
});

server.listen(3001, () => console.log("WebSocket server listening on port 3001"));