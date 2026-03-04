import { useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppDetail from './pages/AppDetail'
import Apps from './pages/Apps'
import CreateApp from './pages/CreateApp'
import Health from './pages/Health'
import ValidateToken from './pages/ValidateToken'
import Home from './pages/Home'
import LFGGroups from './pages/LFGGroups'
import LFGDetail from './pages/LFGDetail'
import CreateLFG from './pages/CreateLFG'
import LFGMyRsvps from './pages/LFGMyRsvps'
import DiscordCallback from './pages/DiscordCallback'
import DiscordLinkCallback from './pages/DiscordLinkCallback'
import Login from './pages/Login'
import MyAccount from './pages/MyAccount'
import Signup from './pages/Signup'

const navItems: { id: string; path: string; label: string; icon: string }[] = [
  { id: 'launcher', path: '/', label: 'Nexin Launcher', icon: '⬡' },
  { id: 'health', path: '/health', label: 'API Health', icon: '◎' },
  { id: 'lfg', path: '/lfg', label: 'LFG', icon: '⚡' },
  { id: 'rsvps', path: '/lfg/my-rsvps', label: 'My RSVPs', icon: '◈' },
  { id: 'apps', path: '/apps', label: 'Apps', icon: '⊞' },
]

function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleLogout = () => {
    logout()
    setShowProfileMenu(false)
    navigate('/')
  }

  return (
    <div className="nexin-app" style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Top bar – Figma design */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 2,
              background: '#E8000E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 800 }}>N</span>
          </div>
          <span style={{ letterSpacing: '0.1em', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            Nexin OS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4ade80',
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>System Online</span>
          </div>

          {!user ? (
            <Link
              to="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 2,
                fontSize: '0.75rem',
                letterSpacing: '0.02em',
                background: '#E8000E',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                textDecoration: 'none',
                transition: 'filter 0.2s',
              }}
            >
              <span>⎋</span>
              Login
            </Link>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: 'var(--surface)',
                    border: '2px solid #E8000E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {user.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div style={{ textAlign: 'left', display: 'none' }}>
                  <p style={{ fontSize: '0.75rem', color: '#fff', margin: 0, lineHeight: 1.2 }}>{user.username}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>@{user.username}</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginLeft: 4 }}>
                  {showProfileMenu ? '▲' : '▼'}
                </span>
              </button>

              {showProfileMenu && (
                <>
                  <div
                    role="presentation"
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: 8,
                      width: 176,
                      borderRadius: 2,
                      padding: '0.25rem 0',
                      zIndex: 50,
                      background: '#111',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 4 }}>
                      <p style={{ fontSize: '0.75rem', color: '#fff', margin: 0 }}>{user.username}</p>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>@{user.username}</p>
                    </div>
                    <Link
                      to="/account"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.6)',
                        textDecoration: 'none',
                      }}
                      onClick={() => setShowProfileMenu(false)}
                    >
                      My Account
                    </Link>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.5rem 1rem',
                          fontSize: '0.75rem',
                          background: 'transparent',
                          border: 'none',
                          color: '#E8000E',
                          cursor: 'pointer',
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar – Figma design */}
        <aside
          style={{
            width: 256,
            borderRight: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem 1rem',
            gap: 4,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 1,
              background: 'linear-gradient(to bottom, transparent, #E8000E, transparent)',
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', paddingLeft: 12 }}>
            Menu
          </p>

          {navItems.map((item) => {
            const isRsvps = item.id === 'rsvps'
            const isApps = item.id === 'apps'
            if (isRsvps && !user) return null
            if (isApps && !user) return null
            const pathMatches = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            const longerMatch = navItems.some(
              (o) => o.path !== item.path && o.path.length > item.path.length && (location.pathname === o.path || location.pathname.startsWith(o.path + '/'))
            )
            const isActive = pathMatches && !longerMatch
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/'}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0.75rem 12px',
                  borderRadius: 2,
                  textAlign: 'left',
                  width: '100%',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(232,0,14,0.12)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? '#E8000E' : 'transparent'}`,
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    fontSize: '1rem',
                    width: 20,
                    textAlign: 'center',
                    color: isActive ? '#E8000E' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {item.icon}
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    letterSpacing: '0.02em',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#E8000E' }}>›</span>
                )}
              </NavLink>
            )
          })}

          <div style={{ marginTop: 'auto', paddingTop: '2rem', paddingLeft: 12 }}>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                padding: 12,
                background: 'rgba(232,0,14,0.05)',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>Version</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Nexin v2.4.1</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2.5rem' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/health" element={<Health />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/apps/new" element={<CreateApp />} />
            <Route path="/apps/validate-token" element={<ValidateToken />} />
            <Route path="/apps/:appId" element={<AppDetail />} />
            <Route path="/lfg" element={<LFGGroups />} />
            <Route path="/lfg/new" element={<CreateLFG />} />
            <Route path="/lfg/:lfgId" element={<LFGDetail />} />
            <Route path="/lfg/my-rsvps" element={<LFGMyRsvps />} />
            <Route path="/account" element={<MyAccount />} />
            <Route path="/discord-callback" element={<DiscordCallback />} />
            <Route path="/discord-link-callback" element={<DiscordLinkCallback />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
