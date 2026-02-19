import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./chat.css";

function ChatModal({ username, userId }) {
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Create socket connection with query parameter for username
        const newSocket = io("http://localhost:3000", {
            query: {
                username: username || `user-${userId}`,
            },
        });

        // Connection established
        newSocket.on("connect", () => {
            console.log("Connected to Socket.IO server");
            setIsConnected(true);
        });

        // Receive messages
        newSocket.on("message", (data) => {
            console.log("Received message:", data);
            setMessages((prevMessages) => [...prevMessages, data]);
        });

        // Connection closed
        newSocket.on("disconnect", () => {
            console.log("Disconnected from Socket.IO server");
            setIsConnected(false);
        });

        // Error handling
        newSocket.on("error", (error) => {
            console.error("Socket.IO error:", error);
        });

        setSocket(newSocket);

        // Cleanup: close socket on component unmount
        return () => {
            newSocket.close();
        };
    }, [username, userId]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim() && socket && isConnected) {
            socket.emit("message", inputValue);
            setInputValue("");
        } else if (!isConnected) {
            console.warn("Socket not connected");
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h3>Chat - {username || userId}</h3>
                <span className={`status ${isConnected ? "connected" : "disconnected"}`}>
                    {isConnected ? "●" : "○"} {isConnected ? "Connected" : "Disconnected"}
                </span>
            </div>
            <div className="messages-list">
                {messages.map((msg, index) => (
                    <div key={index} className="message">
                        <strong>{msg.username}:</strong> {msg.message}
                        <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="message-form">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                    className="message-input"
                />
                <button type="submit" disabled={!isConnected} className="send-button">
                    Send
                </button>
            </form>
        </div>
    );
}

export default ChatModal;