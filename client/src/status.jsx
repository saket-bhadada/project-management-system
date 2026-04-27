import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./status.css";

function CurrentStatus() {
  const [apply, setApply]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate              = useNavigate();

  useEffect(() => {
    async function loadApply() {
      try {
        setLoading(true);
        const response = await fetch(`/api/apply`, { credentials: 'include' });

        if (response.status === 401 || response.status === 403) {
          navigate('/login');
          return;
        }
        if (!response.ok)
          throw new Error(`Failed to load applications: ${response.status}`);

        const data = await response.json();
        setApply(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadApply();
  }, [navigate]);

  if (loading) {
    return (
      <div className="status-container">
        <div className="loading-container">
          <div className="back-link" onClick={() => navigate('/')} style={{ marginBottom: '32px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Projects
          </div>
          <span className="loader"></span>
          <p>Fetching your application statuses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-container">
        <div className="error-container">
          <div className="back-link" onClick={() => navigate('/')} style={{ marginBottom: '24px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Projects
          </div>
          <div className="empty-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="status-container">
      <header className="status-header">
        <div className="back-link" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Projects
        </div>
        <h2>My Applications</h2>
        <p>Track the progress of your project applications and join discussions.</p>
      </header>

      {apply.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <h3>No Applications Found</h3>
          <p>You haven't applied to any projects yet. Start exploring and apply to collaborate!</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '24px' }}>
            Browse Projects
          </button>
        </div>
      ) : (
        <div className="status-list">
          {apply.map((apl) => (
            <div
              key={apl.id}
              className={`status-card ${apl.status}`}
            >
              <div className="status-info">
                <div className="status-message">
                  "{apl.message_text}"
                </div>
                
                <div className="status-meta">
                  <div className="meta-item">
                    <span title="Posted By">👤</span>
                    {apl.email}
                  </div>
                  
                  <div className={`status-badge ${apl.status}`}>
                    {apl.status === 'accepted' && '✅ '}
                    {apl.status === 'rejected' && '❌ '}
                    {apl.status === 'pending' && '⏳ '}
                    {apl.status}
                  </div>
                </div>
              </div>

              {apl.status === "accepted" && (
                <div className="chat-action">
                  <button
                    className="chat-btn"
                    onClick={() => navigate(`/chats/${apl.message_id}`)}
                  >
                    <span>💬</span>
                    <span>Open Chat</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CurrentStatus;