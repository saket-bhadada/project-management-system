import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';

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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
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
  const bottomRef                       = useRef(null);

  const {
    messages, online, loading, error,
    send, loadMore, remove
  } = useChat(roomId);

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

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
  };

  const handleRemove = (userId) => {
    remove(userId)
      .then(() => setParticipants(prev => prev.filter(p => p.id !== userId)))
      .catch(err => alert(err.message));
  };

  // ── LOADING STATES ──
  if (authLoading)
    return <p style={styles.center}>Checking session...</p>;

  if (!user)
    return <p style={styles.center}>You are not logged in.</p>;

  if (!messageId)
    return (
      <div style={styles.emptyWrapper}>
        <div style={styles.emptyIcon}>💬</div>
        <p style={styles.emptyTitle}>No chat selected</p>
        <p style={styles.emptyText}>
          Select a chat from your applications or status page to begin messaging.
        </p>
      </div>
    );

  if (roomError)
    return <p style={{ ...styles.center, color: 'red' }}>{roomError}</p>;

  if (!roomId)
    return <p style={styles.center}>Loading chat room...</p>;

  // ── MAIN UI ──
  return (
    <div style={styles.wrapper}>

      {/* ── LEFT PANEL — Participants ── */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          Participants
          <span style={styles.onlineBadge}>{online.length} online</span>
        </div>

        {participants.map(p => (
          <div key={p.id} style={styles.participantRow}>
            <div style={styles.participantInfo}>
              <div style={{
                ...styles.onlineDot,
                background: online.includes(p.id) ? '#22c55e' : '#d1d5db'
              }}/>
              <span style={styles.participantEmail}>{p.email}</span>
            </div>
            {p.id !== user.id && (
              <button
                style={styles.removeBtn}
                onClick={() => handleRemove(p.id)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── RIGHT PANEL — Messages ── */}
      <div style={styles.chatPanel}>

        {/* Header */}
        <div style={styles.chatHeader}>
          Chat
        </div>

        {/* Load more */}
        <button style={styles.loadMoreBtn} onClick={loadMore}>
          Load older messages
        </button>

        {/* Message thread */}
        <div style={styles.messageList}>
          {loading && <p style={styles.center}>Loading messages...</p>}
          {error   && <p style={{ ...styles.center, color: 'red' }}>{error}</p>}

          {messages.map(msg => {
            const isOwn = msg.sender_email === user.email;
            return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: isOwn ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={styles.messageGroup}>
                  {!isOwn && (
                    <div style={styles.senderLabel}>{msg.sender_email}</div>
                  )}
                  <div style={{
                    ...styles.bubble,
                    background:   isOwn ? '#0084ff' : '#f0f0f0',
                    color:        isOwn ? '#fff'    : '#000',
                    borderRadius: isOwn
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px'
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    ...styles.timestamp,
                    textAlign: isOwn ? 'right' : 'left'
                  }}>
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
        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={styles.input}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: input.trim() ? 1 : 0.5
            }}
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = {
  wrapper: {
    display:       'flex',
    height:        '100vh',
    fontFamily:    'sans-serif',
    background:    '#f9fafb',
  },
  emptyWrapper: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    height:         '100vh',
    background:     '#f9fafb',
  },
  emptyIcon: {
    fontSize:      '48px',
    marginBottom:  '16px',
  },
  emptyTitle: {
    fontSize:      '18px',
    fontWeight:    '600',
    color:         '#111827',
    margin:        '0 0 8px 0',
  },
  emptyText: {
    fontSize:      '14px',
    color:         '#6b7280',
    textAlign:     'center',
    maxWidth:      '300px',
  },
  sidebar: {
    width:         '260px',
    background:    '#fff',
    borderRight:   '1px solid #e5e7eb',
    display:       'flex',
    flexDirection: 'column',
    overflowY:     'auto',
  },
  sidebarHeader: {
    padding:        '16px',
    fontWeight:     '600',
    fontSize:       '14px',
    borderBottom:   '1px solid #e5e7eb',
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  onlineBadge: {
    fontSize:      '11px',
    background:    '#dcfce7',
    color:         '#16a34a',
    padding:       '2px 8px',
    borderRadius:  '999px',
  },
  participantRow: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '10px 16px',
    borderBottom:   '1px solid #f3f4f6',
  },
  participantInfo: {
    display:   'flex',
    alignItems:'center',
    gap:       '8px',
    overflow:  'hidden',
  },
  onlineDot: {
    width:        '8px',
    height:       '8px',
    borderRadius: '50%',
    flexShrink:   0,
  },
  participantEmail: {
    fontSize:     '13px',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  removeBtn: {
    background:   'none',
    border:       'none',
    color:        '#ef4444',
    cursor:       'pointer',
    fontSize:     '12px',
    padding:      '2px 6px',
    borderRadius: '4px',
    flexShrink:   0,
  },
  chatPanel: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    overflow:      'hidden',
  },
  chatHeader: {
    padding:      '16px',
    fontWeight:   '600',
    fontSize:     '15px',
    borderBottom: '1px solid #e5e7eb',
    background:   '#fff',
  },
  loadMoreBtn: {
    margin:       '8px auto',
    display:      'block',
    background:   'none',
    border:       '1px solid #e5e7eb',
    borderRadius: '999px',
    padding:      '4px 16px',
    fontSize:     '12px',
    cursor:       'pointer',
    color:        '#6b7280',
  },
  messageList: {
    flex:          1,
    overflowY:     'auto',
    padding:       '16px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
  },
  messageRow: {
    display: 'flex',
  },
  messageGroup: {
    maxWidth: '70%',
  },
  senderLabel: {
    fontSize:     '11px',
    color:        '#9ca3af',
    marginBottom: '2px',
    paddingLeft:  '4px',
  },
  bubble: {
    padding:    '10px 14px',
    fontSize:   '14px',
    lineHeight: '1.4',
    wordBreak:  'break-word',
  },
  timestamp: {
    fontSize:   '10px',
    color:      '#9ca3af',
    marginTop:  '2px',
    padding:    '0 4px',
  },
  inputRow: {
    display:      'flex',
    padding:      '12px 16px',
    borderTop:    '1px solid #e5e7eb',
    background:   '#fff',
    gap:          '8px',
  },
  input: {
    flex:         1,
    padding:      '10px 14px',
    borderRadius: '999px',
    border:       '1px solid #e5e7eb',
    fontSize:     '14px',
    outline:      'none',
  },
  sendBtn: {
    padding:      '10px 20px',
    background:   '#0084ff',
    color:        '#fff',
    border:       'none',
    borderRadius: '999px',
    fontSize:     '14px',
    cursor:       'pointer',
    fontWeight:   '500',
  },
  center: {
    textAlign: 'center',
    color:     '#6b7280',
    marginTop: '40px',
  },
};