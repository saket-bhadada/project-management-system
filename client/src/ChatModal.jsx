import React, { useState, useEffect, useRef } from "react";
import "./chat.css";

export default function ChatModal({ isOpen, onClose, userId, userEmail }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && userId) {
            loadMessages();
            // Poll for new messages every 3 seconds
            const interval = setInterval(loadMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [isOpen, userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function loadMessages() {
        if (!userId) return;
        
        try {
            setLoading(true);
            const response = await fetch(`/api/chat/${userId}`, {
                credentials: "include",
            });

            if (!response.ok) throw new Error("Failed to load messages");

            const data = await response.json();
            if (data.success) {
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error("Error loading chat messages:", error);
        } finally {
            setLoading(false);
        }
    }

    async function sendMessage(e) {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        try {
            setSending(true);
            const response = await fetch(`/api/chat/${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ message: newMessage }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const data = await response.json();
            if (data.success) {
                setMessages([...messages, data.message]);
                setNewMessage("");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="chat-modal-overlay" onClick={onClose}>
            <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="chat-header">
                    <div className="chat-header-info">
                        <h3>Chat with {userEmail}</h3>
                        <span className="online-status">● Online</span>
                    </div>
                    <button className="close-chat-btn" onClick={onClose}>✕</button>
                </div>

                <div className="chat-messages">
                    {loading && messages.length === 0 ? (
                        <div className="chat-loading">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="chat-empty">No messages yet. Start the conversation!</div>
                    ) : (
                        messages.map((msg, index) => (
                            <div
                                key={msg.id || index}
                                className={`chat-message ${msg.sender_id === userId ? "received" : "sent"}`}
                            >
                                <div className="message-bubble">
                                    <p>{msg.message_text}</p>
                                    <span className="message-time">
                                        {new Date(msg.created_at).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-form" onSubmit={sendMessage}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                    />
                    <button type="submit" disabled={!newMessage.trim() || sending}>
                        {sending ? "⌛" : "➤"}
                    </button>
                </form>
            </div>
        </div>
    );
}
