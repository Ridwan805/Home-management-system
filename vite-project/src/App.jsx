import React from 'react'
import './App.css'
import Register from './components/Register'
import Login from './components/Login'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <h1>Home Management System</h1>
        <div className="auth-sections">
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            {/* You can add a dashboard or home route here */}
            <Route path="*" element={<Navigate to="/register" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
