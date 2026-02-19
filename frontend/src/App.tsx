import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppDetail from './pages/AppDetail'
import Apps from './pages/Apps'
import CreateApp from './pages/CreateApp'
import Health from './pages/Health'
import Home from './pages/Home'
import Items from './pages/Items'
import Login from './pages/Login'
import MyAccount from './pages/MyAccount'
import Signup from './pages/Signup'

function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          Nexin Launcher
        </Link>
        <Link to="/health" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          API Health
        </Link>
        <Link to="/items" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Items
        </Link>
        {user && (
          <Link to="/apps" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Apps
          </Link>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <Link to="/account" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                My Account
              </Link>
              <span style={{ color: 'var(--text-muted)' }}>{user.username}</span>
              <button type="button" onClick={handleLogout} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginRight: '0.75rem' }}>
                Log in
              </Link>
              <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Sign up
              </Link>
            </>
          )}
        </span>
      </nav>
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/health" element={<Health />} />
          <Route path="/items" element={<Items />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/apps/new" element={<CreateApp />} />
          <Route path="/apps/:appId" element={<AppDetail />} />
          <Route path="/account" element={<MyAccount />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
