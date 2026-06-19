import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getWebSocketURL } from "./config";
import "./workspace.css";
import { appearBtn } from "./lib/animate.js";
import NavScrollExample from "./navbar.jsx";

// Reusable hook to check user session
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data?.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { user, loading };
}

export default function Workspace() {
  const { messageId } = useParams();
  const { user, loading: authLoading } = useAuth();

  // State Management
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);

  // New File Modal/Form State
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFilePath, setNewFilePath] = useState("/");
  const [newFileLanguage, setNewFileLanguage] = useState("javascript");
  const [newFileContent, setNewFileContent] = useState("");

  // History and Activity Drawer States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [saveFlash, setSaveFlash] = useState(false);

  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };
  // Split-Screen Chat Sidebar State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatParticipants, setChatParticipants] = useState([]);
  const [onlineParticipants, setOnlineParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const wsRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Editor Ref for dynamic line numbers
  const textareaRef = useRef(null);
  const lineCounterRef = useRef(null);

  // Button refs for entrance animations
  const buttonsInitRef = useRef(false);
  const workspaceRootRef = useRef(null);

  useEffect(() => {
    if (!buttonsInitRef.current && workspaceRootRef.current) {
      const buttons = workspaceRootRef.current.querySelectorAll('button');
      buttons.forEach((btn, index) => {
        appearBtn(btn, index * 20);
      });
      buttonsInitRef.current = true;
    }
  });

  // Apply light theme
  useEffect(() => {
    document.body.classList.add('light-theme');
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, []);

  // Sync scroll between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineCounterRef.current) {
      lineCounterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Generate line numbers
  const lineCount = editorContent.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // Fetch Files in Project
  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch(`/api/projects/${messageId}/files`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setError(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || "Failed to load files.");
      }
    } catch {
      setError("Failed to fetch files from server.");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (messageId && user) {
      fetchFiles();
      fetchActivity();
    }
  }, [messageId, user]);

  // Fetch single file content when selected
  const handleSelectFile = async (file) => {
    setLoadingContent(true);
    setSelectedFile(file);
    setHistory([]);
    try {
      const response = await fetch(`/api/projects/${messageId}/files/${file.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEditorContent(data.file.content || "");
        setChangeSummary("");
        fetchFileHistory(file.id);
      } else {
        showToast("Failed to load file content.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContent(false);
    }
  };

  // Fetch file history
  const fetchFileHistory = async (fileId) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/projects/${messageId}/files/${fileId}/history`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch Project Activity (Handles 500 error fallback gracefully)
  const fetchActivity = async () => {
    setLoadingActivities(true);
    try {
      const response = await fetch(`/api/projects/${messageId}/activity`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data || []);
      } else {
        // Fallback placeholder if backend activity fails due to database name bugs
        console.warn("Backend /activity route returned an error. Using fallback.");
        setActivities([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Save changes to current file
  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      const response = await fetch(`/api/projects/${messageId}/files/${selectedFile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editorContent,
          change_summery: changeSummary.trim() || "update file content",
        }),
        credentials: "include",
      });

      if (response.ok) {
        const updated = await response.json();
        // Update files list
        setFiles(files.map(f => f.id === updated.id ? { ...f, updated_at: updated.updated_at } : f));
        setChangeSummary("");
        fetchFileHistory(selectedFile.id);
        fetchActivity();
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 1500);
        showToast("File saved successfully!", "success");
      } else {
        showToast("Failed to save file.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error occurred while saving.", "error");
    }
  };

  // Create new file (Handles the backend success with 404 status quirk)
  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const response = await fetch(`/api/projects/${messageId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFileName.trim(),
          path: newFilePath.trim() || "/",
          language: newFileLanguage,
          content: newFileContent,
        }),
        credentials: "include",
      });

      // Crucial: The backend projects.js POST route returns res.status(404).json(rows[0]) upon success!
      // Therefore, we check if the response parses into a valid file object despite status code.
      const data = await response.json().catch(() => ({}));
      
      if (response.ok) {
        setShowNewFileModal(false);
        setNewFileName("");
        setNewFilePath("/");
        setNewFileLanguage("javascript");
        setNewFileContent("");
        
        // Refresh explorer & select the newly created file
        fetchFiles();
        fetchActivity();
        
        if (data.id) {
          handleSelectFile(data);
        }
        showToast("File created successfully!", "success");
      } else {
        showToast(data.error || data.message || "Failed to create file.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error when creating file.", "error");
    }
  };

  // Delete current file
  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedFile.name}"?`)) return;

    try {
      const response = await fetch(`/api/projects/${messageId}/files/${selectedFile.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setFiles(files.filter((f) => f.id !== selectedFile.id));
        setSelectedFile(null);
        setEditorContent("");
        setHistory([]);
        fetchActivity();
        showToast("File deleted successfully!", "success");
      } else {
        showToast("Failed to delete file.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── INTEGRATED WEBSOCKET CHAT LOGIC ──
  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) setShowActivities(false);
  };

  const toggleActivities = () => {
    setShowActivities(!showActivities);
    if (!showActivities) setShowChat(false);
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat]);

  // Load chat room ID and configure WebSocket
  useEffect(() => {
    if (!showChat || !messageId || !user) return;

    // Fetch chat room ID
    fetch(`/api/chat/room/${messageId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.roomId) {
          setRoomId(data.roomId);
          loadChatHistory(data.roomId);
          loadParticipants(data.roomId);
        }
      })
      .catch((err) => console.error(err));
  }, [showChat, messageId, user]);

  // Initialize WebSocket when roomId is resolved
  useEffect(() => {
    if (!roomId || !showChat) return;

    const ws = new WebSocket(getWebSocketURL('/ws/chat'));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId }));
    };

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === "message") {
        setChatMessages((prev) => [...prev, msg]);
      }
      if (msg.type === "presence") {
        setOnlineParticipants(msg.online || []);
      }
    };

    return () => {
      ws.close();
    };
  }, [roomId, showChat]);

  const loadChatHistory = (rId) => {
    fetch(`/api/chat/${rId}/messages`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setChatMessages(Array.isArray(data) ? data : data.messages || []);
      })
      .catch((e) => console.error(e));
  };

  const loadParticipants = (rId) => {
    fetch(`/api/chat/${rId}/participants`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setChatParticipants(Array.isArray(data) ? data : data.participants || []);
      })
      .catch((e) => console.error(e));
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "message", content: chatInput.trim() }));
    setChatInput("");
  };

  // Group files by directories to display folder structures
  const buildFileTree = () => {
    const tree = {};
    files.forEach((file) => {
      let path = file.path;
      if (!path.startsWith("/")) path = "/" + path;
      if (!path.endsWith("/")) path = path + "/";

      if (!tree[path]) {
        tree[path] = [];
      }
      tree[path].push(file);
    });
    return tree;
  };

  const fileTree = buildFileTree();

  // Rendering Loading and Unauthenticated states
  if (authLoading) {
    return (
      <div className="workspace-loader-container">
        <div className="workspace-spinner"></div>
        <p>Initializing developer workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="workspace-unauthorized">
        <h3>Access Denied</h3>
        <p>Please log in to collaborate on this workspace.</p>
        <Link to="/login" className="workspace-btn btn-primary">Go to Login</Link>
      </div>
    );
  }

  return (
    <>
      <NavScrollExample />
      <div className="workspace-root" ref={workspaceRootRef}>
      
        {/* ── TOP HEADER BAR ── */}
      <header className="workspace-header">
        <div className="header-left">
          <Link to={`/chats/${messageId}`} className="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chat Page
          </Link>
          <div className="project-badge">
            <span className="project-icon">⚡</span>
            <h2>Project Workspace #{messageId}</h2>
          </div>
        </div>

        <div className="header-right">
          <button 
            className={`workspace-icon-btn ${showActivities ? "active" : ""}`} 
            onClick={() => { toggleActivities(); fetchActivity(); }}
            title="Project Activity Feed"
          >
            <span className="btn-label">📋 Activity Logs</span>
          </button>
          <button 
            className={`workspace-icon-btn chat-toggle-btn ${showChat ? "active" : ""}`}
            onClick={toggleChat}
          >
            <span className="btn-label">💬 Room Chat {showChat ? "✕" : ""}</span>
          </button>
        </div>
      </header>

      {/* ── CORE LAYOUT CONTAINER ── */}
      <div className="workspace-main-container">
        
        {/* ── LEFT PANEL: FILE EXPLORER ── */}
        <aside className="workspace-sidebar">
          <div className="sidebar-section-header">
            <span>Files Explorer</span>
            <button className="create-file-btn" onClick={() => setShowNewFileModal(true)}>
              <span className="btn-label">+ Add File</span>
            </button>
          </div>

          <div className="file-tree-container">
            {loadingFiles ? (
              <div className="mini-loader">Loading explorer...</div>
            ) : error ? (
              <div className="explorer-error">{error}</div>
            ) : files.length === 0 ? (
              <div className="empty-files-hint">
                <p>No project files found.</p>
                <button onClick={() => setShowNewFileModal(true)}>
                  <span className="btn-label">Create one now</span>
                </button>
              </div>
            ) : (
              Object.keys(fileTree).map((dirPath) => (
                <div key={dirPath} className="directory-group">
                  <div className="directory-title">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" className="dir-icon">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span>{dirPath}</span>
                  </div>
                  <div className="directory-files">
                    {fileTree[dirPath].map((file) => (
                      <div
                        key={file.id}
                        className={`file-row ${selectedFile?.id === file.id ? "active" : ""}`}
                        onClick={() => handleSelectFile(file)}
                      >
                        <span className="file-language-tag">{file.language.substring(0, 3).toLowerCase()}</span>
                        <span className="file-name-text">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── CENTER PANEL: IDE CANVAS ── */}
        <main className="workspace-editor-canvas">
          {selectedFile ? (
            <div className="editor-layout">
              {/* File Title Bar */}
              <div className="editor-file-header">
                <div className="file-meta-info">
                  <span className="file-title-path">
                    {selectedFile.path === "/" ? "" : selectedFile.path}
                    <strong>{selectedFile.name}</strong>
                  </span>
                  <span className="file-lang-pill">{selectedFile.language}</span>
                </div>
                <button className="delete-file-btn" onClick={handleDeleteFile} title="Delete File">
                  <span className="btn-label">🗑️ Delete File</span>
                </button>
              </div>

              {/* Code Editor Body */}
              <div className="editor-textarea-wrapper">
                {loadingContent ? (
                  <div className="editor-loading-overlay">
                    <div className="workspace-spinner"></div>
                    <p>Fetching file content...</p>
                  </div>
                ) : (
                  <>
                    {/* Line numbers container */}
                    <div className="editor-line-numbers" ref={lineCounterRef}>
                      {lineNumbers.map((num) => (
                        <div key={num} className="line-num">{num}</div>
                      ))}
                    </div>

                    {/* Monospaced Code Textarea */}
                    <textarea
                      ref={textareaRef}
                      className="editor-textarea"
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      onScroll={handleScroll}
                      spellCheck="false"
                      placeholder="// Start typing your code here..."
                    />
                  </>
                )}
              </div>

              {/* Editor Save/Commit Bar */}
              <div className="editor-commit-footer">
                <div className="summary-input-wrapper">
                  <span className="commit-icon">📝</span>
                  <input
                    type="text"
                    className="change-summary-input"
                    placeholder="Enter short change summary (e.g. 'fixed database bug')"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                  />
                </div>
                <button 
                  className={`save-file-btn ${saveFlash ? "success-flash" : ""}`} 
                  onClick={handleSaveFile}
                  disabled={loadingContent}
                >
                  <span className="btn-label">💾 Save & Commit Changes</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="editor-empty-state">
              <div className="empty-ide-icon">💻</div>
              <h3>Collaborative Coding Workspace</h3>
              <p>Select a file from the explorer on the left to start editing, or create a brand new file to share with other participants.</p>
              <button className="workspace-btn btn-primary" onClick={() => setShowNewFileModal(true)}>
                <span className="btn-label">+ Create New File</span>
              </button>
            </div>
          )}
        </main>

        {/* ── RIGHT COLLAPSIBLE DRAWER: FILE HISTORY ── */}
        {selectedFile && (
          <aside className="workspace-history-sidebar">
            <div className="history-header">
              <span>📜 Change History</span>
            </div>
            <div className="history-list-container">
              {loadingHistory ? (
                <div className="mini-loader">Loading versions...</div>
              ) : history.length === 0 ? (
                <div className="history-empty">No versions logged. Save the file to start tracking versions.</div>
              ) : (
                <div className="history-timeline">
                  {history.map((rev) => (
                    <div key={rev.id} className="history-item">
                      <div className="history-bullet"></div>
                      <div className="history-item-details">
                        <p className="history-summary">"{rev.change_summery || "update"}"</p>
                        <p className="history-author">by {rev.changed_by_email}</p>
                        <span className="history-date">
                          {new Date(rev.create_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

      </div>

      {/* Backdrop for sliding drawers */}
      <div 
        className={`workspace-backdrop ${showChat || showActivities ? "show" : ""}`}
        onClick={() => { setShowChat(false); setShowActivities(false); }}
      />

      {/* ── FLOATING/SLIDING ROOM CHAT PANEL ── */}
      <div className={`sliding-chat-drawer ${showChat ? "open" : ""}`}>
        <div className="chat-drawer-header">
          <span>💬 Collaboration Chat</span>
          <button className="close-drawer-btn" onClick={() => setShowChat(false)}>
            <span className="btn-label">✕</span>
          </button>
        </div>

        {/* Chat Drawer Sidebar lists room participants */}
        <div className="chat-drawer-participants">
          <small>Room Users: </small>
          {chatParticipants.map(p => (
            <span key={p.id} className={`participant-tag ${onlineParticipants.includes(p.id) ? "online" : ""}`}>
              {p.email.split("@")[0]}
            </span>
          ))}
        </div>

        {/* Chat message history thread */}
        <div className="chat-drawer-messages">
          {chatMessages.map((msg, i) => {
            const isOwn = msg.sender_email === user.email;
            return (
              <div key={i} className={`drawer-msg-row ${isOwn ? "own" : "peer"}`}>
                <div className="drawer-msg-bubble">
                  {!isOwn && <small className="drawer-msg-sender">{msg.sender_email.split("@")[0]}</small>}
                  <p>{msg.content}</p>
                  <small className="drawer-msg-time">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat message input footer */}
        <div className="chat-drawer-footer">
          <input
            type="text"
            className="drawer-chat-input"
            placeholder="Type code feedback..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
          />
          <button className="drawer-send-btn" onClick={handleSendChatMessage}>
            <span className="btn-label">Send</span>
          </button>
        </div>
      </div>

      {/* ── PROJECT-WIDE ACTIVITY FEED DRAWER ── */}
      <div className={`sliding-activity-drawer ${showActivities ? "open" : ""}`}>
        <div className="drawer-header">
          <span>📊 Recent Project Activity Logs</span>
          <button className="close-drawer-btn" onClick={() => setShowActivities(false)}>
            <span className="btn-label">✕</span>
          </button>
        </div>
        <div className="activity-drawer-body">
          {loadingActivities ? (
            <div className="mini-loader">Loading activity logs...</div>
          ) : activities.length === 0 ? (
            <div className="activities-empty">
              No recent changes found for this project workspace.
            </div>
          ) : (
            <div className="activity-log-list">
              {activities.map((act, index) => (
                <div key={index} className="activity-log-card">
                  <div className="activity-log-icon">📁</div>
                  <div className="activity-log-details">
                    <p className="act-desc">
                      <strong>{act.changed_by_email}</strong> updated file:{" "}
                      <span className="act-file-path">{act.path === "/" ? "" : act.path}{act.file_name}</span>
                    </p>
                    <p className="act-summary">Summary: "{act.change_summary || "modified"}"</p>
                    <span className="act-time">
                      {new Date(act.created_at || act.create_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── NEW FILE CREATION MODAL OVERLAY ── */}
      {showNewFileModal && (
        <div className="modal-overlay">
          <div className="modal-content glassmorphism">
            <h3>Create a New Project File</h3>
            <form onSubmit={handleCreateFile}>
              <div className="form-group">
                <label>File Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. index.html, helpers.py, styles.css"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Directory Path</label>
                <input
                  type="text"
                  placeholder="e.g. /, /src, /components/utils"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                />
                <small className="field-hint">Specify the parent folder path. Defaults to '/'</small>
              </div>

              <div className="form-group">
                <label>Language Preset</label>
                <select
                  value={newFileLanguage}
                  onChange={(e) => setNewFileLanguage(e.target.value)}
                >
                  <option value="javascript">JavaScript / React (JSX)</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS / Vanilla Styles</option>
                  <option value="markdown">Markdown (.md)</option>
                  <option value="sql">SQL Query</option>
                  <option value="plaintext">Plaintext File</option>
                </select>
              </div>

              <div className="form-group">
                <label>Initial File Template (Optional)</label>
                <textarea
                  className="modal-textarea"
                  placeholder="// Initial boilerplate code..."
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  rows="4"
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="workspace-btn btn-secondary" onClick={() => setShowNewFileModal(false)}>
                  <span className="btn-label">Cancel</span>
                </button>
                <button type="submit" className="workspace-btn btn-primary">
                  <span className="btn-label">Create File</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      <div className="workspace-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`workspace-toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      </div>
    </>
  );
}
