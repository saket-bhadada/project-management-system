import React, { useEffect, useState } from "react";
import "./home.css";
import NavScrollExample from "./navbar.jsx";

function Home() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    async function loadMessages() {
      try {
        // First try a dedicated messages endpoint
        let response = await fetch(`/api/messages`);
        if (response.ok) {
          // try parse JSON (array of messages)
          try {
            const data = await response.json();
            setMessages(Array.isArray(data) ? data : []);
            return;
          } catch (e) {
            // fall through to try text endpoint
          }
        }

        // Fallback: try a generic home endpoint that may return text
        response = await fetch(`/api/home`);
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const text = await response.text();
        // If backend returned JSON text, try parse
        try {
          const parsed = JSON.parse(text);
          setMessages(Array.isArray(parsed) ? parsed : []);
        } catch {
          // not JSON — show the text as a single message
          setMessages([{ id: 1, message: text, email: "", created_at: new Date().toISOString() }]);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }

    loadMessages();
  }, []);

  return (
    <>
      <NavScrollExample />
      <div className="container">
        <h2>All Messages</h2>

        {messages.map((msg) => (
          <div key={msg.id} className="project">
            <div className="message">{msg.message}</div>
            <div className="email">{msg.email}</div>
            <div className="time">{new Date(msg.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Home;
