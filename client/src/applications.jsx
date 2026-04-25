import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavScrollExample from "./navbar.jsx";
import "./applications.css";

function Applications() {
  const [user, setUser]                       = useState(null);
  const [messages, setMessages]               = useState([]);
  const [applicantsByMessage, setApplicantsByMessage] = useState({});
  const [expandedMessage, setExpandedMessage] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const navigate                              = useNavigate();

  // Load user profile
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const response = await fetch("/api/profile", { credentials: "include" });

        if (response.status === 401 || response.status === 403) {
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (data.success) {
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

  // Load applicants for a message
  async function loadApplicants(messageId) {
    try {
      const response = await fetch(
        `/api/messages/${messageId}/applications`,
        { credentials: "include" }
      );
      if (response.status === 403) return [];
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`Error loading applicants for message ${messageId}:`, err);
      return [];
    }
  }

  // Toggle applicants view
  async function toggleApplicants(messageId) {
    if (expandedMessage === messageId) {
      setExpandedMessage(null);
    } else {
      setExpandedMessage(messageId);
      if (!applicantsByMessage[messageId]) {
        const applicants = await loadApplicants(messageId);
        setApplicantsByMessage(prev => ({ ...prev, [messageId]: applicants }));
      }
    }
  }

  // Update application status — triggers chat room creation on accept
  async function handleupdateApplication(applicationId, newStatus, messageId) {
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/status`,
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!response.ok) throw new Error('Failed to update application status');

      // Update local state
      setApplicantsByMessage(prev => ({
        ...prev,
        [messageId]: prev[messageId].map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      }));

      // If accepted — navigate directly to the chat
      if (newStatus === 'accepted') {
        navigate(`/chats/${messageId}`);
      }
    } catch (err) {
      console.error('Error updating application:', err);
      alert('Failed to update application status');
    }
  }

  if (loading) return (
    <div>
      <NavScrollExample />
      <div style={{ padding: "20px" }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div>
      <NavScrollExample />
      <div style={{ padding: "20px", color: "red" }}>{error}</div>
    </div>
  );

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

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="view-applicants-btn"
                    onClick={() => toggleApplicants(msg.id)}
                  >
                    {expandedMessage === msg.id ? "Hide Applicants" : "View Applicants"}
                  </button>

                  {/* Owner can open the chat for this message */}
                  <button
                    onClick={() => navigate(`/chats/${msg.id}`)}
                    style={{
                      padding:      "8px 16px",
                      background:   "#0084ff",
                      color:        "#fff",
                      border:       "none",
                      borderRadius: "8px",
                      cursor:       "pointer",
                      fontWeight:   "500"
                    }}
                  >
                    💬 Open Chat
                  </button>
                </div>

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
                              <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <strong>Status:</strong>
                                <span className={`status-badge status-${applicant.status}`}>
                                  {applicant.status}
                                </span>
                                <select
                                  value={applicant.status}
                                  onChange={(e) =>
                                    // pass messageId so we can navigate after accept
                                    handleupdateApplication(applicant.id, e.target.value, msg.id)
                                  }
                                  style={{
                                    padding:      '4px 8px',
                                    borderRadius: '4px',
                                    border:       '1px solid #ccc',
                                    cursor:       'pointer'
                                  }}
                                >
                                  <option value="pending">pending</option>
                                  <option value="accepted">accepted</option>
                                  <option value="rejected">rejected</option>
                                </select>
                              </p>
                              <p className="applied-date">
                                Applied: {new Date(applicant.created_at).toLocaleDateString()}
                              </p>

                              {/* Show chat button if already accepted */}
                              {applicant.status === 'accepted' && (
                                <button
                                  onClick={() => navigate(`/chats/${msg.id}`)}
                                  style={{
                                    padding:      "6px 12px",
                                    background:   "#0084ff",
                                    color:        "#fff",
                                    border:       "none",
                                    borderRadius: "8px",
                                    cursor:       "pointer",
                                    fontSize:     "13px"
                                  }}
                                >
                                  💬 Open Chat
                                </button>
                              )}
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