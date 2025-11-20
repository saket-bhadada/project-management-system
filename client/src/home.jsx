import React, { useEffect, useState } from "react";
import "./home.css";
import NavScrollExample from "./navbar.jsx";

function Home() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [email, setEmail] = useState("");

  async function loadMessages() {
    try {
      const response = await fetch(`/api/home`);
      if (!response.ok) throw new Error(`Failed to load messages: ${response.status}`);
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

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
        <h2>All Messages</h2>

        {messages.length === 0 ? (
          <div>No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="project" style={{ marginBottom: 12, padding: 12, border: '1px solid #eee' }}>
              <div className="message">{msg.message}</div>
              <div className="email">{msg.email}</div>
              <div className="time">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default Home;
