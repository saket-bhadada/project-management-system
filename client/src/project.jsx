import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getWebSocketURL } from "./config";
import "./project.css";
import { appearBtn } from "./lib/animate.js";


// ── Language detection ──
const detectLang = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    java: "java",
    cpp: "cpp",
    c: "c",
    css: "css",
    html: "html",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
  };
  return map[ext] || "plaintext";
};

const LANG_COLORS = {
  javascript: "#f7df1e",
  typescript: "#3178c6",
  python: "#3776ab",
  css: "#1572b6",
  html: "#e34f26",
  json: "#000",
  markdown: "#083fa1",
  sql: "#4479a1",
  bash: "#4eaa25",
  yaml: "#cb171e",
  go: "#00add8",
  rust: "#ce422b",
  java: "#007396",
  plaintext: "#888",
};

// ── Hooks ──
function useProjectWS(projectId) {
  const wsRef = useRef(null);
  const [online, setOnline] = useState([]);
  const [wsReady, setWsReady] = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!projectId) return;
    const ws = new WebSocket(getWebSocketURL('/ws/project'));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join_project", projectId }));
      setWsReady(true);
    };
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === "presence") setOnline(msg.online || []);
      const fn = listenersRef.current[msg.type];
      if (fn) fn(msg);
    };
    ws.onclose = () => setWsReady(false);
    ws.onerror = () => setWsReady(false);
    return () => ws.close();
  }, [projectId]);

  const on = useCallback((type, fn) => {
    listenersRef.current[type] = fn;
  }, []);
  const off = useCallback((type) => {
    delete listenersRef.current[type];
  }, []);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { online, wsReady, send, on, off };
}

// ── Main Component ──
export default function ProjectManager() {
  const { messageId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [fileContents, setFileContents] = useState({}); // id → content string
  const [dirtyFiles, setDirtyFiles] = useState(new Set());
  const [activity, setActivity] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFilePath, setNewFilePath] = useState("/");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const [liveEditors, setLiveEditors] = useState({}); // fileId → [email]
  const [remoteCursors, setRemoteCursors] = useState({}); // userId → {line, col, email}
  const [viewingMap, setViewingMap] = useState({}); // userId → fileId

  const editorRef = useRef(null);
  const saveTimerRef = useRef(null);
  const rootRef = useRef(null);
  const userId = user?.id;

  const { online, wsReady, send, on, off } = useProjectWS(messageId);

  // Trigger button animations when they mount
  useEffect(() => {
    if (rootRef.current) {
      const buttons = rootRef.current.querySelectorAll('button:not([data-animated])');
      buttons.forEach((btn, i) => {
        btn.setAttribute('data-animated', 'true');
        appearBtn(btn, i * 20);
      });
    }
  });

  // Load user
  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUser(d.user);
        else navigate("/login");
      })
      .catch(() => navigate("/login"));
  }, []);

  // Load files
  const loadFiles = useCallback(async () => {
    if (!messageId) return;
    const r = await fetch(`/api/projects/${messageId}/files`, {
      credentials: "include",
    });
    if (r.status === 403) {
      navigate("/home");
      return;
    }
    const data = await r.json();
    setFiles(data);
    setLoading(false);
  }, [messageId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Load activity
  const loadActivity = useCallback(async () => {
    const r = await fetch(`/api/projects/${messageId}/activity`, {
      credentials: "include",
    });
    if (r.ok) setActivity(await r.json());
  }, [messageId]);

  useEffect(() => {
    if (showActivity) loadActivity();
  }, [showActivity]);

  // Select file → load content
  const selectFile = useCallback(
    async (fileId) => {
      setActiveFileId(fileId);
      setShowHistory(false);
      if (fileContents[fileId] !== undefined) {
        send({ type: "viewing_file", fileId });
        return;
      }
      const r = await fetch(`/api/projects/${messageId}/files/${fileId}`, {
        credentials: "include",
      });
      const f = await r.json();
      setFileContents((prev) => ({ ...prev, [fileId]: f.content }));
      send({ type: "viewing_file", fileId });
    },
    [messageId, fileContents, send],
  );

  // WS event handlers
  useEffect(() => {
    // Someone else is typing
    on("file_edit", (msg) => {
      if (msg.editorId === userId) return;
      setFileContents((prev) => ({ ...prev, [msg.fileId]: msg.content }));
      // Show live cursor
      setRemoteCursors((prev) => ({
        ...prev,
        [msg.editorId]: {
          line: msg.cursorLine,
          col: msg.cursorCol,
          email: msg.editorEmail,
        },
      }));
    });

    // A save happened
    on("file_saved", (msg) => {
      setFileContents((prev) => ({ ...prev, [msg.fileId]: msg.content }));
      setDirtyFiles((prev) => {
        const s = new Set(prev);
        s.delete(msg.fileId);
        return s;
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
      if (showActivity) loadActivity();
    });

    // New file created by someone else
    on("file_created", (msg) => {
      setFiles((prev) => [...prev, msg.file]);
    });

    // File deleted by someone else
    on("file_deleted", (msg) => {
      setFiles((prev) => prev.filter((f) => f.id !== msg.fileId));
      if (activeFileId === msg.fileId) setActiveFileId(null);
    });

    // User cursor move
    on("cursor_move", (msg) => {
      if (msg.userId === userId) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [msg.userId]: { line: msg.line, col: msg.col, email: msg.userEmail },
      }));
    });

    // User opened a file
    on("user_viewing", (msg) => {
      setViewingMap((prev) => ({ ...prev, [msg.userId]: msg.fileId }));
    });

    return () => {
      off("file_edit");
      off("file_saved");
      off("file_created");
      off("file_deleted");
      off("cursor_move");
      off("user_viewing");
    };
  }, [userId, activeFileId, showActivity, loadActivity, on, off]);

  // Compute who's editing each file
  useEffect(() => {
    const map = {};
    online.forEach((u) => {
      const fid = viewingMap[u.userId] || u.activeFile;
      if (fid) {
        if (!map[fid]) map[fid] = [];
        if (u.userId !== userId) map[fid].push(u.email);
      }
    });
    setLiveEditors(map);
  }, [online, viewingMap, userId]);

  // Handle editor input
  const handleEditorChange = (e) => {
    const content = e.target.value;
    setFileContents((prev) => ({ ...prev, [activeFileId]: content }));
    setDirtyFiles((prev) => new Set(prev).add(activeFileId));

    // Broadcast live edit
    const lines = content.substring(0, e.target.selectionStart).split("\n");
    send({
      type: "file_edit",
      fileId: activeFileId,
      content,
      cursorLine: lines.length,
      cursorCol: lines[lines.length - 1].length,
    });

    // Auto-save debounce
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(
      () => saveFile(activeFileId, content, "Auto-saved"),
      3000,
    );
  };

  const saveFile = useCallback(
    async (fileId, content, summary = "Saved") => {
      if (!fileId || content === undefined) return;
      setSaveStatus("saving");
      send({ type: "file_save", fileId, content, changeSummary: summary });
      // Also REST save as backup
      try {
        await fetch(`/api/projects/${messageId}/files/${fileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content, change_summary: summary }),
        });
        setDirtyFiles((prev) => {
          const s = new Set(prev);
          s.delete(fileId);
          return s;
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch {
        setSaveStatus("error");
      }
    },
    [messageId, send],
  );

  // Ctrl+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeFileId && fileContents[activeFileId] !== undefined) {
          clearTimeout(saveTimerRef.current);
          saveFile(activeFileId, fileContents[activeFileId], "Manual save");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFileId, fileContents, saveFile]);

  // Create new file
  const createFile = async () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const path = newFilePath.trim() || "/";
    const language = detectLang(name);

    const r = await fetch(`/api/projects/${messageId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, path, language, content: "" }),
    });
    if (!r.ok) {
      alert("Failed to create file");
      return;
    }
    const file = await r.json();
    setFiles((prev) => [...prev, file]);
    setFileContents((prev) => ({ ...prev, [file.id]: "" }));
    setNewFileName("");
    setNewFilePath("/");
    setShowNewFile(false);
    selectFile(file.id);
    send({ type: "file_created", file });
  };

  // Delete file
  const deleteFile = async (fileId, e) => {
    e.stopPropagation();
    if (!confirm("Delete this file? This cannot be undone.")) return;
    const r = await fetch(`/api/projects/${messageId}/files/${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      alert("Cannot delete this file");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) setActiveFileId(null);
    send({ type: "file_deleted", fileId });
  };

  // Load history for active file
  const loadHistory = async () => {
    if (!activeFileId) return;
    const r = await fetch(
      `/api/projects/${messageId}/files/${activeFileId}/history`,
      { credentials: "include" },
    );
    if (r.ok) setHistory(await r.json());
    setShowHistory(true);
  };

  const activeFile = files.find((f) => f.id === activeFileId);
  const content =
    activeFileId !== null ? (fileContents[activeFileId] ?? "") : "";

  // Group files by path
  const fileTree = files.reduce((acc, f) => {
    const key = f.path || "/";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  if (loading)
    return (
      <div className="pm-loading">
        <div className="pm-loading-spinner" />
        <span>Loading project…</span>
      </div>
    );

  return (
    <div className="pm-root" ref={rootRef}>
      {/* ── TOP BAR ── */}
      <header className="pm-topbar">
        <div className="pm-topbar-left">
          <button className="pm-back-btn" onClick={() => navigate(-1)}>
            <span className="btn-label">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>
          <div className="pm-project-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3h18v18H3z" />
              <path d="M9 3v18" />
            </svg>
            Project #{messageId}
          </div>
        </div>

        <div className="pm-topbar-center">
          {activeFile && (
            <div className="pm-breadcrumb">
              <span className="pm-breadcrumb-path">{activeFile.path}/</span>
              <span className="pm-breadcrumb-name">{activeFile.name}</span>
              {dirtyFiles.has(activeFileId) && (
                <span className="pm-dirty-dot" />
              )}
            </div>
          )}
        </div>

        <div className="pm-topbar-right">
          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="pm-status pm-status--saving">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="pm-status pm-status--saved">✓ Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="pm-status pm-status--error">Save failed</span>
          )}

          {/* WS indicator */}
          <div
            className={`pm-ws-dot ${wsReady ? "pm-ws-dot--on" : "pm-ws-dot--off"}`}
            title={wsReady ? "Live" : "Disconnected"}
          >
            <span />
            {wsReady ? "Live" : "Offline"}
          </div>

          {/* Online users */}
          <div className="pm-online-users">
            {online.slice(0, 5).map((u) => (
              <div key={u.userId} className="pm-avatar" title={u.email}>
                {u.email[0].toUpperCase()}
              </div>
            ))}
            {online.length > 5 && (
              <div className="pm-avatar pm-avatar--more">
                +{online.length - 5}
              </div>
            )}
          </div>

          {/* Activity toggle */}
          <button
            className="pm-icon-btn"
            onClick={() => setShowActivity((v) => !v)}
            title="Activity"
          >
            <span className="btn-label">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
          </button>

          {/* Save button */}
          {activeFile && (
            <button
              className="pm-save-btn"
              onClick={() => saveFile(activeFileId, content, "Manual save")}
            >
              <span className="btn-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </span>
            </button>
          )}
        </div>
      </header>

      <div className="pm-body">
        {/* ── SIDEBAR ── */}
        <aside className="pm-sidebar">
          <div className="pm-sidebar-header">
            <span>Files</span>
            <button
              className="pm-new-file-btn"
              onClick={() => setShowNewFile((v) => !v)}
              title="New file"
            >
              <span className="btn-label">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </button>
          </div>

          {/* New file form */}
          {showNewFile && (
            <div className="pm-new-file-form">
              <input
                autoFocus
                placeholder="filename.js"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFile();
                  if (e.key === "Escape") setShowNewFile(false);
                }}
                className="pm-new-file-input"
              />
              <input
                placeholder="path (e.g. /src)"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                className="pm-new-file-input"
              />
              <div className="pm-new-file-actions">
                <button className="pm-new-file-create" onClick={createFile}>
                  <span className="btn-label">Create</span>
                </button>
                <button
                  className="pm-new-file-cancel"
                  onClick={() => setShowNewFile(false)}
                >
                  <span className="btn-label">Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* File tree */}
          <div className="pm-file-tree">
            {Object.entries(fileTree)
              .sort()
              .map(([path, pathFiles]) => (
                <div key={path} className="pm-file-group">
                  {path !== "/" && (
                    <div className="pm-folder-label">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M10 4H2v16h20V6H12l-2-2z" />
                      </svg>
                      {path}
                    </div>
                  )}
                  {pathFiles.map((file) => {
                    const isActive = file.id === activeFileId;
                    const isDirty = dirtyFiles.has(file.id);
                    const viewers = liveEditors[file.id] || [];
                    const langColor = LANG_COLORS[file.language] || "#888";

                    return (
                      <div
                        key={file.id}
                        className={`pm-file-item ${isActive ? "pm-file-item--active" : ""}`}
                        onClick={() => selectFile(file.id)}
                      >
                        <div
                          className="pm-file-lang-dot"
                          style={{ background: langColor }}
                        />
                        <span className="pm-file-name">{file.name}</span>
                        {isDirty && <span className="pm-dirty-dot" />}
                        {viewers.length > 0 && (
                          <div className="pm-file-viewers">
                            {viewers.slice(0, 2).map((email, i) => (
                              <div
                                key={i}
                                className="pm-viewer-dot"
                                title={`${email} is here`}
                              >
                                {email[0].toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          className="pm-delete-file-btn"
                          onClick={(e) => deleteFile(file.id, e)}
                          title="Delete file"
                        >
                          <span className="btn-label">×</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            {files.length === 0 && (
              <div className="pm-empty-files">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity=".4"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <p>No files yet</p>
                <button
                  className="pm-create-first"
                  onClick={() => setShowNewFile(true)}
                >
                  <span className="btn-label">Create first file</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── EDITOR ── */}
        <main className="pm-editor-area">
          {activeFile ? (
            <>
              {/* Editor toolbar */}
              <div className="pm-editor-toolbar">
                <div className="pm-editor-toolbar-left">
                  <span
                    className="pm-lang-badge"
                    style={{
                      background: LANG_COLORS[activeFile.language] + "22",
                      color: LANG_COLORS[activeFile.language] || "#888",
                      border: `1px solid ${LANG_COLORS[activeFile.language]}44`,
                    }}
                  >
                    {activeFile.language}
                  </span>
                  <span className="pm-line-count">
                    {(fileContents[activeFileId] || "").split("\n").length}{" "}
                    lines
                  </span>
                </div>
                <div className="pm-editor-toolbar-right">
                  {/* Remote cursors legend */}
                  {Object.entries(remoteCursors).map(([uid, cur]) => (
                    <div key={uid} className="pm-remote-cursor-badge">
                      <span className="pm-remote-cursor-dot" />
                      {cur.email} — L{cur.line}:C{cur.col}
                    </div>
                  ))}
                  <button className="pm-history-btn" onClick={loadHistory}>
                    <span className="btn-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
                      </svg>
                      History
                    </span>
                  </button>
                  <span className="pm-shortcut">⌘S to save</span>
                </div>
              </div>

              {/* Code editor */}
              <div className="pm-editor-wrapper">
                {/* Line numbers */}
                <div className="pm-line-numbers" aria-hidden="true">
                  {content.split("\n").map((_, i) => (
                    <div key={i} className="pm-line-num">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  className="pm-editor"
                  value={content}
                  onChange={handleEditorChange}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  onKeyDown={(e) => {
                    // Tab → insert 2 spaces
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const { selectionStart: s, selectionEnd: end } = e.target;
                      const val = content;
                      const newVal = val.slice(0, s) + "  " + val.slice(end);
                      setFileContents((prev) => ({
                        ...prev,
                        [activeFileId]: newVal,
                      }));
                      setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd = s + 2;
                      }, 0);
                    }
                  }}
                  placeholder={`Start coding ${activeFile.name}…`}
                />
              </div>
            </>
          ) : (
            <div className="pm-no-file">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity=".3"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>Select a file to start editing</p>
              <p className="pm-no-file-hint">
                Changes broadcast to all collaborators instantly
              </p>
            </div>
          )}
        </main>

        {/* ── ACTIVITY PANEL ── */}
        {showActivity && (
          <aside className="pm-activity-panel">
            <div className="pm-panel-header">
              <span>Activity</span>
              <button
                className="pm-close-panel"
                onClick={() => setShowActivity(false)}
              >
                <span className="btn-label">×</span>
              </button>
            </div>
            <div className="pm-activity-list">
              {activity.length === 0 && (
                <p className="pm-panel-empty">No activity yet</p>
              )}
              {activity.map((a, i) => (
                <div key={i} className="pm-activity-item">
                  <div className="pm-activity-avatar">
                    {a.changed_by_email[0].toUpperCase()}
                  </div>
                  <div className="pm-activity-detail">
                    <span className="pm-activity-email">
                      {a.changed_by_email}
                    </span>
                    <span className="pm-activity-action">
                      {a.change_summary}
                    </span>
                    <span className="pm-activity-file">
                      {a.path}/{a.file_name}
                    </span>
                    <span className="pm-activity-time">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ── HISTORY MODAL ── */}
      {showHistory && (
        <div
          className="pm-modal-backdrop"
          onClick={() => setShowHistory(false)}
        >
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3>Version History — {activeFile?.name}</h3>
              <button
                className="pm-close-panel"
                onClick={() => setShowHistory(false)}
              >
                <span className="btn-label">×</span>
              </button>
            </div>
            <div className="pm-history-list">
              {history.length === 0 && (
                <p className="pm-panel-empty">No history yet</p>
              )}
              {history.map((v, i) => (
                <div key={v.id} className="pm-history-item">
                  <div className="pm-history-meta">
                    <span className="pm-history-author">
                      {v.changed_by_email}
                    </span>
                    <span className="pm-history-summary">
                      {v.change_summary}
                    </span>
                    <span className="pm-history-time">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  {i === 0 && (
                    <span className="pm-history-current">current</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
