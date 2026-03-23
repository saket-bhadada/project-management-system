import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import NavScrollExample from "./navbar.jsx";
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
  const navigate = useNavigate();

  async function loadMessages() {
    try {
      const response = await fetch(`/api/home`, {
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
    try {
      const response = await fetch(`/api/messages/${messageId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ user_id: ownerId })
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
  async function handleupdateApplication(applicationId,newStatus){
    try{
      const response = await fetch(`/api/applications/${applicationId}/status`,
        {
          method:"PUT",
          headers:{"Content-Type":"application/json"},
          credentials:"include",
          body:JSON.stringify({status:newStatus})
        }
      );
      if(!response.ok){
        throw new Error(`failed to update application status`)
      }

    }catch(err){
      console.error("Error updating application status", err);
      alert("Failed to update application status. Please try again.");
    }
  }
  useEffect(() => {
    loadMessages();
    loadUserApplications();
  }, []);

  useEffect(() => {
    if (user?.typeofuser === "staff") {
      loadAllApplicants();
    }
  }, [staffMessages]);

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

  return (
    <>
      <NavScrollExample />
      <div className="container">
        {user?.typeofuser === "staff" ? (
          // STAFF VIEW: Applications Received
          <>
            <h2>Applications Received</h2>
            {staffMessages.length === 0 ? (
              <div className="empty-state">No messages posted yet.</div>
            ) : (
              staffMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="project"
                  style={{ marginBottom: 12, padding: 12, border: '1px solid #eee' }}
                >
                  <div className="message">{msg.message_text}</div>
                  <div className="email">Posted by: {msg.email}</div>
                  <div className="time">{new Date(msg.created_at).toLocaleString()}</div>
                  
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #ddd' }}>
                    <h4>Applicants ({applicantsByMessage[msg.id]?.length || 0})</h4>
                    {applicantsByMessage[msg.id] && applicantsByMessage[msg.id].length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        {applicantsByMessage[msg.id].map((app) => (
                          <div key={app.id} style={{ padding: 8, backgroundColor: '#f5f5f5', marginBottom: 8, borderRadius: 4 }}>
                            <div><strong>Email:</strong> {app.applicant_email}</div>
                            <div><strong>Status:</strong> <span style={{ color: app.status === "pending" ? "orange" : app.status === "approved" ? "green" : "red" }}>{app.status}</span></div>
                            <div><strong>Applied:</strong> {new Date(app.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontStyle: 'italic' }}>No applicants yet</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          // STUDENT VIEW: All Projects (Status Mode)
          <>
            <h2>All Project</h2>
            {messages.length === 0 ? (
              <div className="empty-state">No messages yet.</div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="project" 
                  style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', cursor: 'pointer' }}
                  onClick={() => handleMessageClick(msg.user_id, msg.email)}
                >
                  <div className="message">{msg.message_text}</div>
                  <div className="email">{msg.email}</div>
                  <div className="time">{new Date(msg.created_at).toLocaleString()}</div>
                  {(() => {
                    const appStatus = userApplications[msg.id];
                    
                    if (appStatus === "approved" || appStatus === "selected") {
                      return (
                        <button className="apply-status apply" onClick={(e) => e.stopPropagation()}>
                          ✓ SELECTED
                        </button>
                      );
                    } else if (appStatus === "pending") {
                      return (
                        <button className="btn-applied apply" disabled onClick={(e) => e.stopPropagation()}>
                          ⏳ APPLIED
                        </button>
                      );
                    } else if (appStatus === "rejected") {
                      return (
                        <button className="btn-rejected apply" disabled onClick={(e) => e.stopPropagation()}>
                          ✗ REJECTED
                        </button>
                      );
                    } else {
                      return (
                        <button
                          className="apply"
                          onClick={(e) => handleApply(e, msg.id, msg.user_id)}
                        >
                            APPLY
                          </button>
                        );
                    }
                  })()}
                </div>
              ))
            )}
          </>
        )}
      </div>

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