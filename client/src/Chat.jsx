import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWebSocketURL } from './config';
import { fadeIn, slideInLeft, appearBtn } from './lib/animate.js';
import NavScrollExample from './navbar.jsx';
import './chat.css';

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────

function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setUser(data?.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { user, loading };
}

function useChat(roomId) {
  const [messages, setMessages] = useState([]);
  const [online, setOnline]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const wsRef = useRef(null);

  // Open WebSocket and join room
  useEffect(() => {
    if (!roomId) return;

    const ws = new WebSocket(getWebSocketURL('/ws/chat'));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId }));
    };

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === 'message')  setMessages(prev => [...prev, msg]);
      if (msg.type === 'presence') setOnline(msg.online);
      if (msg.type === 'error')    setError(msg.text);
    };

    ws.onerror = () => setError('Connection error');

    return () => ws.close();
  }, [roomId]);

  // Load message history
  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    fetch(`/api/chat/${roomId}/messages`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // handle both plain array and { messages: [] } shape
        setMessages(Array.isArray(data) ? data : data.messages || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [roomId]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!messages.length) return;
    const oldest = messages[0].id;
    const res    = await fetch(
      `/api/chat/${roomId}/messages?before=${oldest}&limit=50`,
      { credentials: 'include' }
    );
    const data  = await res.json();
    const older = Array.isArray(data) ? data : data.messages || [];
    setMessages(prev => [...older, ...prev]);
  }, [roomId, messages]);

  // Send a message
  const send = useCallback((content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    }
  }, []);

  // Remove a participant (owner only)
  const remove = useCallback(async (userId) => {
    const res = await fetch(
      `/api/chat/${roomId}/participants/${userId}`,
      { method: 'DELETE', credentials: 'include' }
    );
    if (!res.ok) throw new Error((await res.json()).error);
  }, [roomId]);

  return { messages, online, loading, error, send, loadMore, remove };
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function Chat({ messageId: propMessageId }) {
  const { user, loading: authLoading } = useAuth();
  const { messageId: paramMessageId }  = useParams();
  const messageId = propMessageId || paramMessageId;

  const [roomId, setRoomId]             = useState(null);
  const [roomError, setRoomError]       = useState(null);
  const [participants, setParticipants] = useState([]);
  const [input, setInput]               = useState('');
  const [isSending, setIsSending]       = useState(false);
  const bottomRef                       = useRef(null);

  // Track history message IDs so we only animate NEW ws messages
  const historyIdsRef = useRef(new Set());
  const participantsContainerRef = useRef(null);
  const emptyRef = useRef(null);
  const sendBtnRef = useRef(null);
  const loadMoreBtnRef = useRef(null);
  const workspaceLinkRef = useRef(null);
  const buttonsInitRef = useRef(false);

  const {
    messages, online, loading, error,
    send, loadMore, remove
  } = useChat(roomId);

  // Track which messages came from history load
  useEffect(() => {
    if (!loading && messages.length > 0 && historyIdsRef.current.size === 0) {
      // First load: mark all current messages as history
      messages.forEach(m => {
        if (m.id) historyIdsRef.current.add(m.id);
      });
    }
  }, [loading, messages]);

  // Apply light theme
  useEffect(() => {
    document.body.classList.add('light-theme');
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, []);

  // Fetch roomId for this message
  useEffect(() => {
    if (!messageId || !user) return;
    fetch(`/api/chat/room/${messageId}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Not a participant');
        return r.json();
      })
      .then(data => setRoomId(data.roomId))
      .catch(err => setRoomError(err.message));
  }, [messageId, user]);

  // Fetch participants
  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/chat/${roomId}/participants`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // handle both plain array and { participants: [] } shape
        setParticipants(Array.isArray(data) ? data : data.participants || []);
      });
  }, [roomId]);

  // Animate participants on mount with slideInLeft stagger
  useEffect(() => {
    if (participants.length > 0 && participantsContainerRef.current) {
      const rows = participantsContainerRef.current.querySelectorAll('.chat-participant-row');
      if (rows.length) slideInLeft(rows, 50);
    }
  }, [participants]);

  // Animate empty state with fadeIn
  useEffect(() => {
    if (!messageId && emptyRef.current) {
      fadeIn(emptyRef.current);
    }
  }, [messageId]);

  // appearBtn on mount for all buttons
  useEffect(() => {
    if (buttonsInitRef.current) return;
    const timer = setTimeout(() => {
      if (sendBtnRef.current) appearBtn(sendBtnRef.current, 0);
      if (loadMoreBtnRef.current) appearBtn(loadMoreBtnRef.current, 40);
      if (workspaceLinkRef.current) appearBtn(workspaceLinkRef.current, 80);
      buttonsInitRef.current = true;
    }, 100);
    return () => clearTimeout(timer);
  });

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
    // Brief spring press animation
    setIsSending(true);
    setTimeout(() => setIsSending(false), 300);
  };

  const handleRemove = (userId) => {
    remove(userId)
      .then(() => setParticipants(prev => prev.filter(p => p.id !== userId)))
      .catch(err => alert(err.message));
  };

  // ── LOADING STATES ──
  if (authLoading)
    return <p className="chat-center-text">Checking session...</p>;

  if (!user)
    return <p className="chat-center-text">You are not logged in.</p>;

  if (!messageId)
    return (
      <div className="chat-empty-wrapper" ref={emptyRef}>
        <div className="chat-empty-icon">💬</div>
        <p className="chat-empty-title">No chat selected</p>
        <p className="chat-empty-text">
          Select a chat from your applications or status page to begin messaging.
        </p>
      </div>
    );

  if (roomError)
    return <p className="chat-center-text error">{roomError}</p>;

  if (!roomId)
    return <p className="chat-center-text">Loading chat room...</p>;

  // Helper: is this a NEW message from WebSocket?
  const isNewMessage = (msg) => {
    if (!msg.id) return true; // no id = definitely ws-pushed
    return !historyIdsRef.current.has(msg.id);
  };

  // ── MAIN UI ──
  return (
    <>
      <NavScrollExample />
      <div className="chat-wrapper">

      {/* ── LEFT PANEL — Participants ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          Participants
          <span className="chat-online-badge">{online.length} online</span>
        </div>

        <div ref={participantsContainerRef}>
          {participants.map(p => (
            <div key={p.id} className="chat-participant-row">
              <div className="chat-participant-info">
                <div className="chat-participant-avatar">
                  {p.email ? p.email[0].toUpperCase() : '?'}
                  <div className={`chat-online-dot ${online.includes(p.id) ? 'is-online' : 'is-offline'}`} />
                </div>
                <span className="chat-participant-email">{p.email}</span>
              </div>
              {p.id !== user.id && (
                <button
                  className="chat-remove-btn"
                  onClick={() => handleRemove(p.id)}
                >
                  <span className="btn-label">✕</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — Messages ── */}
      <div className="chat-panel">

        {/* Header */}
        <div className="chat-panel-header">
          <span>Chat Room</span>
          <Link
            ref={workspaceLinkRef}
            to={`/chats/${messageId}/workspace`}
            className="chat-workspace-link"
          >
            <span className="btn-label">📁 Code Workspace</span>
          </Link>
        </div>

        {/* Load more */}
        <button
          ref={loadMoreBtnRef}
          className="chat-load-more-btn"
          onClick={loadMore}
        >
          <span className="btn-label">Load older messages</span>
        </button>

        {/* Message thread */}
        <div className="chat-message-list">
          {loading && <p className="chat-center-text">Loading messages...</p>}
          {error   && <p className="chat-center-text error">{error}</p>}

          {messages.map(msg => {
            const isOwn = msg.sender_email === user.email;
            const isNew = isNewMessage(msg);
            // Mark new messages as seen in history after rendering
            if (msg.id && isNew) {
              historyIdsRef.current.add(msg.id);
            }
            return (
              <div
                key={msg.id}
                className={`chat-message-row ${isOwn ? 'is-own' : 'is-other'}${isNew ? ' is-new' : ''}`}
              >
                <div className="chat-message-group">
                  {!isOwn && (
                    <div className="chat-sender-label">{msg.sender_email}</div>
                  )}
                  <div className="chat-bubble">
                    {msg.content}
                  </div>
                  <div className={`chat-timestamp ${isOwn ? 'align-right' : 'align-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour:   '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button
            ref={sendBtnRef}
            onClick={handleSend}
            className={`chat-send-btn ${input.trim() ? 'is-filled' : 'is-empty'}${isSending ? ' is-sending' : ''}`}
          >
            <span className="btn-label">Send</span>
          </button>
        </div>

      </div>
    </div>
    </>
  );
}