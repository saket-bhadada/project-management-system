import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavScrollExample from "./navbar.jsx";
import "./applications.css";

function Applications() {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [applicantsByMessage, setApplicantsByMessage] = useState({});
    const [expandedMessage, setExpandedMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Load user profile
    useEffect(() => {
        async function loadUserProfile() {
            try {
                const response = await fetch("/api/profile", {
                    credentials: "include",
                });

                if (response.status === 401 || response.status === 403) {
                    navigate("/login");
                    return;
                }

                const data = await response.json();
                if (data.success) {
                    // Check if user is staff
                    if (data.user.typeofuser !== "staff") {
                        setError("Access denied: Staff users only");
                        setLoading(false);
                        return;
                    }
                    setUser(data.user);
                    setMessages(data.messages || []);
                } else {
                    setError(data.message || "Failed to load profile");
                }
            } catch (err) {
                console.error(err);
                setError("Error loading profile");
            } finally {
                setLoading(false);
            }
        }

        loadUserProfile();
    }, [navigate]);

    // Load applicants for each message
    async function loadApplicants(messageId) {
        try {
            const response = await fetch(`/api/messages/${messageId}/applications`, {
                credentials: "include",
            });

            if (response.status === 403) {
                // You're not the owner
                return [];
            }

            if (!response.ok) {
                throw new Error(`Failed to load applicants: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error(`Error loading applicants for message ${messageId}:`, err);
            return [];
        }
    }

    // Toggle applicants view for a message
    async function toggleApplicants(messageId) {
        if (expandedMessage === messageId) {
            setExpandedMessage(null);
        } else {
            setExpandedMessage(messageId);
            // Load applicants if not already loaded
            if (!applicantsByMessage[messageId]) {
                const applicants = await loadApplicants(messageId);
                setApplicantsByMessage({
                    ...applicantsByMessage,
                    [messageId]: applicants,
                });
            }
        }
    }

    if (loading) {
        return (
            <div>
                <NavScrollExample />
                <div style={{ padding: "20px" }}>Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <NavScrollExample />
                <div style={{ padding: "20px", color: "red" }}>{error}</div>
            </div>
        );
    }

    return (
        <div>
            <NavScrollExample />
            <div className="applications-container">
                <h2>View Applications</h2>
                <p className="user-info">Welcome, {user?.email}</p>

                {messages.length === 0 ? (
                    <div className="no-messages">You have not posted any messages yet</div>
                ) : (
                    <div className="messages-list">
                        {messages.map((msg) => (
                            <div key={msg.id} className="message-card">
                                <div className="message-header">
                                    <h4>{msg.message_text}</h4>
                                    <small className="message-date">
                                        {new Date(msg.created_at).toLocaleDateString()}
                                    </small>
                                </div>

                                <button
                                    className="view-applicants-btn"
                                    onClick={() => toggleApplicants(msg.id)}
                                >
                                    {expandedMessage === msg.id ? "Hide Applicants" : "View Applicants"}
                                </button>

                                {expandedMessage === msg.id && (
                                    <div className="applicants-section">
                                        {applicantsByMessage[msg.id]?.length === 0 ? (
                                            <p className="no-applicants">No applicants yet</p>
                                        ) : (
                                            <div className="applicants-list">
                                                {applicantsByMessage[msg.id]?.map((applicant) => (
                                                    <div key={applicant.id} className="applicant-card">
                                                        <div className="applicant-info">
                                                            <p>
                                                                <strong>Email:</strong> {applicant.applicant_email}
                                                            </p>
                                                            <p>
                                                                <strong>Status:</strong>
                                                                <span
                                                                    className={`status-badge status-${applicant.status}`}
                                                                >
                                                                    {applicant.status}
                                                                </span>
                                                            </p>
                                                            <p className="applied-date">
                                                                Applied: {new Date(applicant.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Applications;
