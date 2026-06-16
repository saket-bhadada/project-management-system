import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./status.css";
import PageTransition from "./components/PageTransition.jsx";
import { staggerCards, fadeIn, scaleIn, appearBtn } from "./lib/animate.js";
import NavScrollExample from "./navbar.jsx";

function CurrentStatus() {
  const [apply, setApply]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate              = useNavigate();

  const cardsRef = useRef(null);
  const emptyRef = useRef(null);
  const badgesRef = useRef([]);
  const chatBtnsRef = useRef([]);
  const backBtnRef = useRef(null);
  const browseBtnRef = useRef(null);
  const retryBtnRef = useRef(null);

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
    document.body.classList.add('light-theme');
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, [navigate]);

  // Animate back button on mount
  useEffect(() => {
    if (backBtnRef.current) appearBtn(backBtnRef.current, 0);
  }, [loading, error]);

  // Animate cards, badges, and chat buttons after data loads
  useEffect(() => {
    if (loading || error) return;

    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.status-card');
      if (cards.length > 0) {
        staggerCards(cards);
      }
    }

    // Animate badges with spring
    badgesRef.current.forEach((badge, i) => {
      if (badge) {
        setTimeout(() => scaleIn(badge), i * 80 + 300);
      }
    });

    // Animate chat buttons
    chatBtnsRef.current.forEach((btn, i) => {
      if (btn) appearBtn(btn, i * 60 + 400);
    });

    // Animate empty state
    if (emptyRef.current) {
      fadeIn(emptyRef.current);
    }
  }, [loading, error, apply]);

  // Animate browse/retry button
  useEffect(() => {
    if (browseBtnRef.current) appearBtn(browseBtnRef.current, 200);
  }, [loading, apply]);

  useEffect(() => {
    if (retryBtnRef.current) appearBtn(retryBtnRef.current, 200);
  }, [error]);

  if (loading) {
    return (
      <>
        <NavScrollExample />
        <PageTransition>
          <div className="status-page">
            <div className="status-loading">
              <button
                ref={backBtnRef}
                className="status-back-btn"
                onClick={() => navigate('/')}
              >
                <span className="btn-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Back to Projects
                </span>
              </button>
              <span className="status-loader"></span>
              <p>Fetching your application statuses...</p>
            </div>
          </div>
        </PageTransition>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavScrollExample />
        <PageTransition>
          <div className="status-page">
            <div className="status-error">
              <button
                ref={backBtnRef}
                className="status-back-btn"
                onClick={() => navigate('/')}
              >
                <span className="btn-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Back to Projects
                </span>
              </button>
              <svg className="status-empty-icon" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.5">
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Oops! Something went wrong</h3>
              <p>{error}</p>
              <button
                ref={retryBtnRef}
                className="status-retry-btn"
                onClick={() => window.location.reload()}
              >
                <span className="btn-label">Try Again</span>
              </button>
            </div>
          </div>
        </PageTransition>
      </>
    );
  }

  let chatBtnIdx = 0;

  return (
    <>
      <NavScrollExample />
      <PageTransition>
        <div className="status-page">
          <header className="status-header">
            <button
              ref={backBtnRef}
              className="status-back-btn"
              onClick={() => navigate('/')}
            >
              <span className="btn-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Projects
              </span>
            </button>
            <h2>My Application Status</h2>
          </header>

          {apply.length === 0 ? (
            <div className="status-empty" ref={emptyRef}>
              <svg className="status-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>No Applications Yet</h3>
              <p>You haven't applied to any project listings. Head over to the project board to get started!</p>
              <button
                ref={browseBtnRef}
                className="status-browse-btn"
                onClick={() => navigate('/')}
              >
                <span className="btn-label">Browse Projects</span>
              </button>
            </div>
          ) : (
            <div className="status-list" ref={cardsRef}>
              {apply.map((apl, idx) => {
                const isAccepted = apl.status === 'accepted';
                
                return (
                  <div key={apl.id} className="status-card">
                    <div className="status-card-content">
                      <div className="status-message">
                        "{apl.message_text}"
                      </div>
                      
                      <div className="status-meta">
                        <div className="meta-item">
                          <span title="Posted By">👤</span>
                          {apl.email}
                        </div>
                        
                        <div
                          ref={(el) => { badgesRef.current[idx] = el; }}
                          className={`status-badge ${apl.status}`}
                        >
                          {apl.status === 'accepted' && '✅ '}
                          {apl.status === 'rejected' && '❌ '}
                          {apl.status === 'pending' && '⏳ '}
                          {apl.status}
                        </div>
                      </div>
                    </div>

                    {isAccepted && (
                      <div className="chat-action">
                        <button
                          ref={(el) => { chatBtnsRef.current[chatBtnIdx++] = el; }}
                          className="chat-btn"
                          onClick={() => navigate(`/chats/${apl.message_id}`)}
                        >
                          <span className="btn-label">💬 Open Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageTransition>
    </>
  );
}

export default CurrentStatus;