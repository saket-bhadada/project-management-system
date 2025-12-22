import React, { useState, useEffect } from "react";

export default function ChatModal({ userId }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    async function loadMessages() {
        if (!userId) return;
        try {
            const response = await fetch(`/api/chat/${userId}`, {
                method: "GET",
                credentials: "include",
            });
            const data = await response.json();
            if (data && data.success) {
                setMessages(data.messages || []);
            } else {
                console.error("Failed to load chat messages", data);
            }
        } catch (err) {
            console.error("Error loading messages", err);
        }
    }

    async function sendMessage() {
        if (!newMessage) return;
        try {
            const response = await fetch(`/api/chat`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: newMessage }),
            });
            const data = await response.json();
            if (data && data.success) {
                setMessages(prev => [data.message, ...prev]);
                setNewMessage("");
            } else {
                console.error("Failed to send message", data);
            }
        } catch (err) {
            console.error("Error sending message", err);
        }
    }

    useEffect(() => {
        loadMessages();
    }, [userId]);

    return (
        <div className="chat-modal">
            <h3>Chat</h3>
            <div className="messages">
                {messages.length === 0 ? (
                    <p>No messages.</p>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className="message-item">
                            <div className="message-meta">{m.email || m.user_id} • {new Date(m.created_at).toLocaleString()}</div>
                            <div className="message-text">{m.message_text}</div>
                        </div>
                    ))
                )}
            </div>

            <div className="chat-input">
                <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write a message..." />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}