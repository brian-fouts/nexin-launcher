import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { gameApi } from './api/client'
import { AuthProvider, useAuth } from './context/AuthContext'
import Health from './pages/Health'
import Home from './pages/Home'
import Login from './pages/Login'

function HeartbeatPoll() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user?.user_id || !user?.server_id) return
    const tick = () => {
      gameApi.heartbeat(user.user_id, user.server_id).catch(() => {
        // ignore; will retry next interval
      })
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [user?.user_id, user?.server_id])
  return null
}

function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <HeartbeatPoll />
        <nav
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '1rem 1.5rem',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
        }}
      >
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
          Nexin Game
        </Link>
        <Link to="/health" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Game API Health
        </Link>
        <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Login
        </Link>
      </nav>
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/health" element={<Health />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
    </AuthProvider>
  )
}

export default App
