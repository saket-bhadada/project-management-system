import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";
import PageTransition from "./components/PageTransition.jsx";
import { fadeUp, slideInRight, appearBtn, ripple } from "./lib/animate.js";
import animeModule from "animejs";
import NavScrollExample from "./navbar.jsx";

let anime = animeModule;
if (anime && anime.default) {
  anime = anime.default;
}

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [isUpdatingResume, setIsUpdatingResume] = useState(false);
    const [resumeSuccess, setResumeSuccess] = useState(false);

    const backBtnRef = useRef(null);
    const addBtnRef = useRef(null);
    const deleteBtnsRef = useRef([]);
    const messagesListRef = useRef(null);
    const resumeBtnRef = useRef(null);

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
        document.body.classList.add('light-theme');
        return () => {
            document.body.classList.remove('light-theme');
        };
    }, []);

    // Animate buttons on mount
    useEffect(() => {
        if (backBtnRef.current) appearBtn(backBtnRef.current, 0);
    }, []);

    useEffect(() => {
        if (addBtnRef.current) appearBtn(addBtnRef.current, 100);
    }, [user]);

    useEffect(() => {
        if (resumeBtnRef.current) appearBtn(resumeBtnRef.current, 100);
    }, [user]);

    // Animate message items after load
    useEffect(() => {
        if (messagesListRef.current && messages.length > 0) {
            const items = messagesListRef.current.querySelectorAll('.profile-message-item');
            if (items.length > 0) fadeUp(items, 60);
        }
        // Animate delete buttons
        deleteBtnsRef.current.forEach((btn, i) => {
            if (btn) appearBtn(btn, i * 50 + 200);
        });
    }, [messages, user]);

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
                const updatedMessages = [...messages, data.message];
                setMessages(updatedMessages);
                setNewMessage("");
                // Animate the new message in
                requestAnimationFrame(() => {
                    if (messagesListRef.current) {
                        const items = messagesListRef.current.querySelectorAll('.profile-message-item');
                        const last = items[items.length - 1];
                        if (last) slideInRight(last);
                    }
                });
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
                setResumeSuccess(true);
                setTimeout(() => setResumeSuccess(false), 2000);
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
        // Animate out before removing
        const itemEl = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (itemEl && typeof anime === 'function') {
            try {
                await anime({
                    targets: itemEl,
                    translateX: [0, 40],
                    opacity: [1, 0],
                    duration: 280,
                    easing: 'easeInQuad',
                }).finished;
            } catch (err) {
                console.error("deleteMessage animation error:", err);
            }
        }

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
        <>
            <NavScrollExample />
            <PageTransition>
                <div className="profile-page">
                <button
                    ref={backBtnRef}
                    onClick={() => navigate('/home')}
                    className="profile-back-btn"
                >
                    <span className="btn-label">← Back to Home</span>
                </button>

                <h2>My Profile</h2>

                {/* USER DETAILS */}
                {user ? (
                    <div className="profile-layout">
                        {/* LEFT: User Info */}
                        <div className="profile-info-card">
                            <div className="profile-info-item">
                                <strong>Email</strong>
                                {user.email}
                            </div>
                            <div className="profile-info-item">
                                <strong>User Type</strong>
                                {user.typeofuser}
                            </div>
                        </div>

                        {/* RIGHT: Content */}
                        <div className="profile-content-card">
                            {/* ===========================
                                STUDENT VIEW
                            ============================ */}
                            {user?.typeofuser === "student" && (
                                <div>
                                    <h3 className="section-heading">Student Profile</h3>
                                    
                                    <div className="resume-section-card">
                                        <h4>My Resume</h4>
                                        <div className="resume-current">
                                            {user.resume_url ? (
                                                <p>Current Resume: <a href={user.resume_url} target="_blank" rel="noreferrer">View Resume</a></p>
                                            ) : (
                                                <p className="resume-no-url">No resume uploaded yet.</p>
                                            )}
                                        </div>
                                        
                                        <div className="resume-update-row">
                                            <input 
                                                type="url" 
                                                className="resume-input"
                                                placeholder="Paste your resume URL (e.g. Google Drive link)" 
                                                value={resumeUrl}
                                                onChange={(e) => setResumeUrl(e.target.value)}
                                            />
                                            <button 
                                                ref={resumeBtnRef}
                                                className={`resume-update-btn${resumeSuccess ? ' success-flash' : ''}`}
                                                onClick={updateResume} 
                                                disabled={isUpdatingResume}
                                            >
                                                <span className="btn-label">
                                                    {resumeSuccess ? "✓ Updated" : isUpdatingResume ? "Updating..." : "Update Resume"}
                                                </span>
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
                                    <h3 className="section-heading">My Messages</h3>

                                    {/* Add message */}
                                    <div className="profile-add-message">
                                        <textarea
                                            className="profile-textarea"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Write a message..."
                                        ></textarea>

                                        <button
                                            ref={addBtnRef}
                                            className="profile-add-btn"
                                            onClick={(e) => {
                                                ripple(e.currentTarget, e);
                                                addmessage();
                                            }}
                                        >
                                            <span className="btn-label">Add Message</span>
                                        </button>
                                    </div>

                                    {/* List messages */}
                                    <div className="profile-messages-list" ref={messagesListRef}>
                                        {messages.length > 0 ? (
                                            messages.map((msg, idx) => (
                                                <div
                                                    key={msg.id}
                                                    data-msg-id={msg.id}
                                                    className="profile-message-item"
                                                >
                                                    <p>{msg.message_text}</p>

                                                    {/* Delete only own messages */}
                                                    <button
                                                        ref={(el) => { deleteBtnsRef.current[idx] = el; }}
                                                        className="profile-delete-btn"
                                                        onClick={() => deleteMessage(msg.id)}
                                                    >
                                                        <span className="btn-label">Delete</span>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="profile-no-messages">No messages uploaded.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="profile-skeleton">
                        <div className="skeleton profile-skeleton-left" />
                        <div className="skeleton profile-skeleton-right" />
                    </div>
                )}
            </div>
            </PageTransition>
        </>
    );
}
