import { Link, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Checkers from './pages/Checkers'
import Health from './pages/Health'
import Login from './pages/Login'

function App() {
  return (
    <AuthProvider>
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
            Nexin Checkers
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
            <Route path="/" element={<Checkers />} />
            <Route path="/health" element={<Health />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App
