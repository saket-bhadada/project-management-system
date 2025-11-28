import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");


    async function loadProfile() {
        try {
            const response = await fetch("/api/profile", {
                method: "GET",
                credentials: "include",   // VERY IMPORTANT (allows cookies / sessions)
            });

            const data = await response.json();
            console.log(data);

            if (data.success) {
                setUser(data.user);
                setMessages(data.messages);
            } else {
                console.error("Profile load failed:", data.message);
                // If not authenticated, maybe redirect?
                if (data.message === "Not authenticated") {
                     window.location.href = "/login";
                }
            }
        } catch (err) {
            console.error("Error loading profile", err);
        }
    }

    useEffect(() => {
        loadProfile();
    }, []);

    async function addmessage(){
        if(!newMessage){
            return;
        }
        try{
            const response = await fetch("/api/messages",{
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({message:newMessage})
            })
            const data = await response.json();
            if(data.success){
                setMessages([...messages,data.message]);
                setNewMessage("");
            }
        }catch(err){
            console.error("Error adding message", err);
        }
    }

    async function deleteMessage(msgId) {
        try {
            const response = await fetch(`/api/messages/${msgId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await response.json();

            if (data.success) {
                setMessages(messages.filter(m => m.id !== msgId));
            }
        } catch (err) {
            console.error("Error deleting message", err);
        }
    }

    return (
        <div className="profile-container">
            <button onClick={() => navigate('/home')} className="back-btn">← Back to Home</button>
            <h2>My Profile</h2>

            {/* USER DETAILS */}
            {user ? (
                <>
                    <div className="email">
                        <strong>Email:</strong> {user.email}
                    </div>

                    <div className="type-of-user">
                        <strong>User Type:</strong> {user.typeofuser}
                    </div>
                </>
            ) : (
                <p>Loading profile...</p>
            )}

            <hr />

            {/* ===========================
                STUDENT VIEW
            ============================ */}
            {user?.typeuser === "student" && (
                <div>
                    <h3>Students cannot view messages.</h3>
                </div>
            )}

            {/* ===========================
                STAFF VIEW
            ============================ */}
            {user?.typeofuser === "staff" && (
                <>
                    <h3>My Messages</h3>

                    {/* Add message */}
                    <div className="add-message-box">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Write a message..."
                        ></textarea>

                        <button onClick={addmessage}>Add Message</button>
                    </div>

                    {/* List messages */}
                    <div className="messages-list">
                        {messages.length > 0 ? (
                            messages.map((msg) => (
                                <div key={msg.id} className="message-item">
                                    <p>{msg.message_text}</p>

                                    {/* Delete only own messages */}
                                    <button
                                        className="delete-btn"
                                        onClick={() => deleteMessage(msg.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>No messages uploaded.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
