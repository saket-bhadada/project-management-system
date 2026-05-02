import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [isUpdatingResume, setIsUpdatingResume] = useState(false);

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
                if (data.user?.resume_url) {
                    setResumeUrl(data.user.resume_url);
                }
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

    async function updateResume() {
        if (!resumeUrl.trim()) return;
        setIsUpdatingResume(true);
        try {
            const response = await fetch("/api/profile/resume", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ resume_url: resumeUrl })
            });
            const data = await response.json();
            if (data.success) {
                alert("Resume updated successfully!");
                setUser({ ...user, resume_url: resumeUrl });
            } else {
                alert("Failed to update resume: " + data.message);
            }
        } catch (err) {
            console.error("Error updating resume", err);
            alert("Error updating resume.");
        } finally {
            setIsUpdatingResume(false);
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
            {user?.typeofuser === "student" && (
                <div className="student-section">
                    <h3>Student Profile</h3>
                    
                    <div className="resume-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h4>My Resume</h4>
                        <div style={{ marginBottom: '15px' }}>
                            {user.resume_url ? (
                                <div>
                                    <p>Current Resume: <a href={user.resume_url} target="_blank" rel="noreferrer">View Resume</a></p>
                                </div>
                            ) : (
                                <p style={{ color: '#888' }}>No resume uploaded yet.</p>
                            )}
                        </div>
                        
                        <div className="update-resume" style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="url" 
                                placeholder="Paste your resume URL (e.g. Google Drive link)" 
                                value={resumeUrl}
                                onChange={(e) => setResumeUrl(e.target.value)}
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button 
                                onClick={updateResume} 
                                disabled={isUpdatingResume}
                                style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                {isUpdatingResume ? "Updating..." : "Update Resume"}
                            </button>
                        </div>
                    </div>
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
