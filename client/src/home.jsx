import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import NavScrollExample from "./navbar.jsx";
import PageTransition from "./components/PageTransition.jsx";
import { staggerCards, fadeIn, appearBtn } from "./lib/animate.js";
// import ChatModal from "./ChatModal.jsx";

function Home() {
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [email, setEmail] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userApplications, setUserApplications] = useState({});
  const [staffMessages, setStaffMessages] = useState([]);
  const [applicantsByMessage, setApplicantsByMessage] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cardsRef = useRef(null);
  const emptyRef = useRef(null);
  const btnsRef = useRef([]);

  async function loadMessages(searchQuery = "") {
    try {
      const url = searchQuery ? `/api/home?q=${encodeURIComponent(searchQuery)}` : `/api/home`;
      const response = await fetch(url, {
        credentials: "include",
      });
      
      // Check if redirected to login or unauthorized
      if (response.redirected && response.url.includes('/login')) {
         navigate('/login');
         return;
      }
      if (response.status === 401 || response.status === 403) {
          navigate('/login');
          return;
      }

      if (!response.ok) throw new Error(`Failed to load messages: ${response.status}`);
      const data = await response.json();
      // Check if the response contains a redirect instruction (custom)
      if (data.redirect) {
          navigate(data.redirect);
          return;
        }

        // Store user info
        if (data.user) {
          setUser(data.user);
        }

        // Server returns { user, messages: [...] } when authenticated
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          setStaffMessages(data.messages);
        } else if (Array.isArray(data)) {
          // fallback: server might return an array directly
          setMessages(data);
          setStaffMessages(data);
        } else {
          setMessages([]);
          setStaffMessages([]);
        }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
      setStaffMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserApplications() {
    try {
      const response = await fetch(`/api/apply`, {
        credentials: "include",
      });

      if (!response.ok) {
        console.warn("Failed to load user applications");
        return;
      }

      const applications = await response.json();
      console.log("User applications:", applications); // Debug log
      // Create a map of messageId -> application status
      const appMap = {};
      if (Array.isArray(applications)) {
        applications.forEach(app => {
          appMap[app.message_id] = app.status;
        });
      }
      console.log("Application map:", appMap); // Debug log
      setUserApplications(appMap);
    } catch (error) {
      console.error("Error loading user applications:", error);
    }
  }

  async function loadApplicantsForMessage(messageId) {
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

  async function loadAllApplicants() {
    if (!staffMessages || staffMessages.length === 0) return;

    const newApplicants = {};
    for (const msg of staffMessages) {
      const applicants = await loadApplicantsForMessage(msg.id);
      newApplicants[msg.id] = applicants;
    }
    setApplicantsByMessage(newApplicants);
  }

  async function handleApply(e, messageId, ownerId) {
    e.preventDefault();
    e.stopPropagation();
    
    const applicationMessage = window.prompt("Would you like to add a message to your application? (Optional)");
    if (applicationMessage === null) return; // Cancelled
    
    try {
      const response = await fetch(`/api/messages/${messageId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ user_id: ownerId, application_message: applicationMessage })
      });
      if (!response.ok) {
        throw new Error(`Failed to apply: ${response.status}`);
      }
      const data = await response.json();
      alert("Application submitted successfully!");
      await loadMessages(); // Refresh the list
      await loadUserApplications(); // Reload user's applications to update status
    } catch (err) {
      console.error("Error applying", err);
      alert("Failed to apply. Please try again.");
    }
  }
  // async function handleupdateApplication(applicationId,newStatus){
  //   try{
  //     const response = await fetch(`/api/applications/${applicationId}/status`,
  //       {
  //         method:"PUT",
  //         headers:{"Content-Type":"application/json"},
  //         credentials:"include",
  //         body:JSON.stringify({status:newStatus})
  //       }
  //     );
  //     if(!response.ok){
  //       throw new Error(`failed to update application status`)
  //     }
  //     const data = await response.json();
  //     alert(`Application status updated to ${data.status}`);
  //     await loadAllApplicants();
  //     await loadUserApplications();
  //     await loadMessages();
  //   }catch(err){
  //     console.error("Error updating application status", err);
  //     alert("Failed to update application status. Please try again.");
  //   }
  // }
  useEffect(() => {
    loadMessages();
    loadUserApplications();
    document.body.classList.add('light-theme');
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, []);

  useEffect(() => {
    if (user?.typeofuser === "staff") {
      loadAllApplicants();
    }
  }, [staffMessages]);

  // Animate cards after data loads
  useEffect(() => {
    if (loading) return;

    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.project-card, .staff-project-card');
      if (cards.length > 0) {
        staggerCards(cards);
      }
    }

    // Animate empty state
    if (emptyRef.current) {
      fadeIn(emptyRef.current);
    }
  }, [loading, messages, staffMessages, user]);

  // Animate buttons after cards rendered
  useEffect(() => {
    if (loading) return;
    btnsRef.current.forEach((btn, i) => {
      if (btn) appearBtn(btn, i * 60);
    });
  }, [loading, messages, userApplications]);

  function handleMessageClick(userId, email) {
    if (userId && email) {
      setSelectedUser({ userId, email });
      setChatOpen(true);
    }
  }

  function closeChat() {
    setChatOpen(false);
    setSelectedUser(null);
  }

  // async function handleSubmit(e) {
  //   e.preventDefault();
  //   if (!newMessage.trim()) return;
  //   try {
  //     const response = await fetch(`/api/home`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ message: newMessage, email }),
  //     });
  //     if (response.ok) {
  //       setNewMessage("");
  //       setEmail("");
  //       await loadMessages();
  //     } else {
  //       const err = await response.json().catch(() => ({ error: 'unknown' }));
  //       alert(err.error || 'Failed to add message');
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     alert('Failed to add message');
  //   }
  // }

  /** Determine button state class */
  const getBtnState = (appStatus) => {
    if (appStatus === "accepted" || appStatus === "selected") return "state-selected";
    if (appStatus === "pending") return "state-applied";
    if (appStatus === "rejected") return "state-rejected";
    return "state-default";
  };

  /** Determine button label */
  const getBtnLabel = (appStatus) => {
    if (appStatus === "accepted" || appStatus === "selected") return "✓ SELECTED";
    if (appStatus === "pending") return "⏳ APPLIED";
    if (appStatus === "rejected") return "✗ REJECTED";
    return "APPLY";
  };

  return (
    <>
      <NavScrollExample onSearch={(query) => loadMessages(query)} />
      <PageTransition>
        <div className="home-container">
          {/* Loading skeleton */}
          {loading && (
            <>
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
            </>
          )}

          {!loading && user?.typeofuser === "staff" ? (
            // STAFF VIEW: Applications Received
            <>
              <h2>Applications Received</h2>
              {staffMessages.length === 0 ? (
                <div className="home-empty-state" ref={emptyRef}>No messages posted yet.</div>
              ) : (
                <div ref={cardsRef}>
                  {staffMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="staff-project-card"
                    >
                      <div className="card-title">{msg.message_text}</div>
                      <div className="card-email">Posted by: {msg.email}</div>
                      <div className="card-time">{new Date(msg.created_at).toLocaleString()}</div>
                      
                      <div className="staff-applicants-divider">
                        <h4>Applicants ({applicantsByMessage[msg.id]?.length || 0})</h4>
                        {applicantsByMessage[msg.id] && applicantsByMessage[msg.id].length > 0 ? (
                          <>
                            {applicantsByMessage[msg.id].map((app) => (
                              <div key={app.id} className="staff-applicant-row">
                                <div><strong>Email:</strong> {app.applicant_email}</div>
                                {app.applicant_resume_url && (
                                    <div><strong>Resume:</strong> <a href={app.applicant_resume_url} target="_blank" rel="noreferrer">View Resume</a></div>
                                )}
                                {app.application_message && (
                                    <div><strong>Message:</strong> {app.application_message}</div>
                                )}
                                <div><strong>Status:</strong> <span 
                                className={`applicant-status-text ${app.status}`}
                                >{app.status}</span></div>
                                <div><strong>Applied:</strong> {new Date(app.created_at).toLocaleString()}</div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="no-applicants-text">No applicants yet</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : !loading ? (
            // STUDENT VIEW: All Projects (Status Mode)
            <>
              <h2>All Projects</h2>
              {messages.length === 0 ? (
                <div className="home-empty-state" ref={emptyRef}>No messages yet.</div>
              ) : (
                <div ref={cardsRef}>
                  {messages.map((msg, idx) => {
                    const appStatus = userApplications[msg.id];
                    const btnState = getBtnState(appStatus);
                    const btnLabel = getBtnLabel(appStatus);

                    return (
                      <div 
                        key={msg.id} 
                        className="project-card"
                      >
                        <div className="card-title">{msg.message_text}</div>
                        <div className="card-email">{msg.email}</div>
                        <div className="card-time">{new Date(msg.created_at).toLocaleString()}</div>

                        {/* IRON RULE: Single button, always in DOM, state via className */}
                        <button
                          ref={(el) => { btnsRef.current[idx] = el; }}
                          className={`apply-btn ${btnState}`}
                          onClick={(e) => {
                            if (btnState === "state-default") {
                              handleApply(e, msg.id, msg.user_id);
                            } else {
                              e.stopPropagation();
                            }
                          }}
                        >
                          <span className="btn-label">{btnLabel}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      </PageTransition>

      {chatOpen && selectedUser && (
        <ChatModal
          isOpen={chatOpen}
          onClose={closeChat}
          userId={selectedUser.userId}
          userEmail={selectedUser.email}
        />
      )}
    </>
  );
}

export default Home;