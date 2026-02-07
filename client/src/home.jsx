import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import NavScrollExample from "./navbar.jsx";
// import ChatModal from "./ChatModal.jsx";

function Home() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [email, setEmail] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  async function loadMessages() {
    try {
      const response = await fetch(`/api/home`);
      
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

        // Server returns { user, messages: [...] } when authenticated
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else if (Array.isArray(data)) {
          // fallback: server might return an array directly
          setMessages(data);
        } else {
          setMessages([]);
        }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
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
        body: JSON.stringify({ user_id: ownerId })
      });
      if (!response.ok) {
        throw new Error(`Failed to apply: ${response.status}`);
      }
      const data = await response.json();
      alert("Application submitted successfully!");
      await loadMessages(); // Refresh the list
    } catch (err) {
      console.error("Error applying", err);
      alert("Failed to apply. Please try again.");
    }
  }
  useEffect(() => {
    loadMessages();
  }, []);

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
                switch (msg.status) {
                  case "selected":
                    return (
                      <button className="apply-status apply" onClick={(e) => e.stopPropagation()}>
                        SELECTED
                      </button>
                    );
                  case "applied":
                    return (
                      <button className="btn-applied apply" disabled onClick={(e) => e.stopPropagation()}>
                        ⏳ APPLIED
                      </button>
                    );
                  default:
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