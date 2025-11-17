import React, { useState, useEffect } from "react";
import "./profile.css";

export default function Profile() {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);

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
            }
        } catch (err) {
            console.error("Error loading profile", err);
        }
    }

    useEffect(() => {
        loadProfile();
    }, []);

    return (
        <div className="profile-container">

            <h2>My Profile</h2>

            {/* USER DETAILS */}
            {user ? (
                <>
                    <div className="email">
                        <strong>Email:</strong> {user.email}
                    </div>

                    <div className="type-of-user">
                        <strong>User Type:</strong> {user.typeuser}
                    </div>
                </>
            ) : (
                <p>Loading profile...</p>
            )}

            <hr />

            {/* USER MESSAGES */}
            <h3>My Messages</h3>

            <div className="messages-list">
                {messages.length > 0 ? (
                    messages.map((msg, index) => (
                        <div key={index} className="message-item">
                            {msg.message}
                        </div>
                    ))
                ) : (
                    <p>No messages uploaded.</p>
                )}
            </div>

        </div>
    );
}
