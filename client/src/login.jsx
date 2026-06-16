import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fadeUp, scaleIn, ripple, appearBtn } from './lib/animate.js'
import './App.css'

function Login(){
    const [email,setEmail] = React.useState('')
    const [password,setPassword] = React.useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
  const navigate = useNavigate()

  const cardRef = useRef(null)
  const btnRef = useRef(null)
  const errorRef = useRef(null)

  // Entrance animations on mount
  useEffect(() => {
    if (cardRef.current) fadeUp(cardRef.current)
    if (btnRef.current) appearBtn(btnRef.current, 200)
  }, [])

  // Animate error message when it appears
  useEffect(() => {
    if (error && errorRef.current) scaleIn(errorRef.current)
  }, [error])

    async function handleSubmit(e){
        e.preventDefault();
        setError('')
        setLoading(true)
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json();
          console.log('Login response:', data);
          if (response.ok && data.redirect) {
            // navigate within the SPA to the redirected path
            navigate(data.redirect);
          } else if (!response.ok) {
            // show server message or generic error
            setError(data.message || 'Login failed')
          }
        } catch (error) {
            console.error('Login failed:', error);
            setError('Network error. Please try again.')
        } finally {
          setLoading(false)
        }
    }

    function handlegooglebutton(){
        console.log('google');
    }

    return (
    <div className="auth-page">
      {/* Left hero panel */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <h1>Live PM</h1>
          <p>Manage your projects with clarity, speed, and confidence.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel">
        <div className="auth-card" ref={cardRef}>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your account</p>

          {error && (
            <div className="error-message" ref={errorRef}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                placeholder=" "
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="login-email">Email address</label>
            </div>

            <div className="form-group">
              <input
                type="password"
                placeholder=" "
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="login-password">Password</label>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              ref={btnRef}
              disabled={loading}
              onClick={(e) => ripple(e.currentTarget, e)}
            >
              {loading && <span className="btn-spinner" />}
              <span className="btn-label">{loading ? 'Signing in…' : 'Sign In'}</span>
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login
