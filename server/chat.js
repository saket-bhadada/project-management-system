import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

export default function setupChat(server) {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        },
        path: "/socket.io/",
    });

    io.on("connection", (socket) => {
        const username = socket.handshake.query.username;
        const clientId = uuidv4();
        socket.id = clientId;
        console.log("Socket.IO connected; username=", username, "clientId=", clientId);

        // Join a room based on username for targeted messaging
        if (username) {
            socket.join(`user-${username}`);
        }

        // Handle sending messages
        socket.on("message", (data) => {
            console.log("received message from", username, ":", data);
            // Broadcast to all connected clients
            io.emit("message", {
                username,
                message: data,
                timestamp: new Date(),
            });
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log("Socket.IO disconnected; username=", username);
        });

        // Handle errors
        socket.on("error", (err) => {
            console.error("Socket.IO error:", err);
        });
    });
}