import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import { useNavigate, Link } from 'react-router-dom'
import { fadeUp, scaleIn, ripple, appearBtn } from './lib/animate.js'

function Registration() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('student') // store selected option
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cardRef = useRef(null)
  const btnRef = useRef(null)
  const errorRef = useRef(null)

  const navigate = useNavigate()

  // Entrance animations on mount
  useEffect(() => {
    if (cardRef.current) fadeUp(cardRef.current)
    if (btnRef.current) appearBtn(btnRef.current, 200)
  }, [])

  // Animate error message when it appears
  useEffect(() => {
    if (error && errorRef.current) scaleIn(errorRef.current)
  }, [error])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, userType }),
      })
      const data = await response.json()
      console.log('Registration response:', data)
      if (response.ok && data.redirect) {
        navigate(data.redirect)
      } else if (!response.ok) {
        setError(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration failed:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleButton() {
    console.log('google')
  }

  return (
    <div className="auth-page">
      {/* Left hero panel */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <h1>Live PM</h1>
          <p>Join the platform and start managing projects seamlessly.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel">
        <div className="auth-card" ref={cardRef}>
          <h2>Create Account</h2>
          <p className="auth-subtitle">Get started in seconds</p>

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
                id="reg-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="reg-email">Email address</label>
            </div>

            <div className="form-group">
              <input
                type="password"
                placeholder=" "
                id="reg-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="reg-password">Password</label>
            </div>

            <div className="form-group">
              <select
                id="reg-usertype"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="has-value"
                required
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </select>
              <label htmlFor="reg-usertype">Role</label>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              ref={btnRef}
              disabled={loading}
              onClick={(e) => ripple(e.currentTarget, e)}
            >
              {loading && <span className="btn-spinner" />}
              <span className="btn-label">{loading ? 'Creating account…' : 'Create Account'}</span>
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Registration
