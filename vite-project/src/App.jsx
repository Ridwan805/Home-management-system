import React from 'react'
import './App.css'
import Register from './components/Register'
import Login from './components/Login'

function App() {
  return (
    <div className="app">
      <h1>Home Management System</h1>
      <div className="auth-sections">
        <Register />
        <Login />
      </div>
    </div>
  )
}

export default App
