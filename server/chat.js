import { WebSocketServer } from "ws";
import url from "url";
import { v4 as uuidv4 } from "uuid";

export default function setupChat(server) {
    const wss = new WebSocketServer({ server, path: "/chat" });

    wss.on("connection", (ws, req) => {
        const { username } = url.parse(req.url || "", true).query || {};
        const clientId = uuidv4();
        ws.id = clientId;
        console.log("WebSocket connected; username=", username);
        console.log(clientId);

        ws.on("message", (message) => {
            const text = message.toString();
            console.log("received:", text);
            // Echo the message back for now
            ws.send(`Echo: ${text}`);
        });

        ws.on("close", () => console.log("WebSocket closed"));
        ws.on("error", (err) => console.error("WebSocket error:", err));
    });
}