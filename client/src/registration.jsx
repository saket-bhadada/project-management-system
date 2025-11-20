import React, { useState } from 'react'
import './App.css'
import { useNavigate } from 'react-router-dom'

function Registration() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('student') // store selected option

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
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
        alert(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  const navigate = useNavigate()

  function handleGoogleButton() {
    console.log('google')
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Register</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />

        <select
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          style={styles.select}
          required
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>

        <button type="submit" style={styles.button}>
          Register
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    width: '350px',
    margin: '100px auto',
    padding: '30px',
    borderRadius: '10px',
    backgroundColor: '#f8f9fa',
    boxShadow: '0 0 15px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  title: {
    marginBottom: '20px',
    fontSize: '24px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    margin: '10px 0',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    outline: 'none',
  },
  select: {
    margin: '10px 0',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    color: '#333',
    outline: 'none',
    cursor: 'pointer',
  },
  button: {
    marginTop: '10px',
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: '0.3s',
  },
  signupText: {
    marginTop: '15px',
    fontSize: '14px',
    color: '#555',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
}

export default Registration
