import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHealth } from '../api/hooks'

const quickAccessCards = [
  { path: '/health', label: 'API Health', icon: '◎', desc: 'Monitor services', color: '#22c55e' },
  { path: '/lfg', label: 'LFG', icon: '⚡', desc: 'Find your squad', color: '#E8000E' },
  { path: '/lfg/my-rsvps', label: 'My RSVPs', icon: '◈', desc: 'Upcoming events', color: '#f59e0b' },
  { path: '/apps', label: 'Apps', icon: '⊞', desc: 'Your ecosystem', color: '#6366f1' },
]

export default function Home() {
  const { user } = useAuth()
  const { data, isSuccess } = useHealth()

  return (
    <div>
      {/* Hero – Figma "Ready to Launch" block */}
      <div className="hero-block">
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
          Welcome back
        </p>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 600, margin: '0 0 0.5rem', color: '#fff' }}>
          Ready to Launch
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', maxWidth: '28rem', marginBottom: 0 }}>
          Everything you need in one place. Pick a destination below or use the sidebar to navigate.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <div
            style={{
              height: 1,
              flex: 1,
              maxWidth: '20rem',
              background: 'linear-gradient(to right, #E8000E, transparent)',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>NEXIN LAUNCHER</span>
        </div>
      </div>

      {/* Backend status – inline with design */}
      {isSuccess && data && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Backend status:</span>
          <span className="badge badge-ok">
            {data.service}: {data.status}
          </span>
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
        Quick Access
      </p>
      <div className="quick-access-grid">
        {quickAccessCards.map((card) => {
          if ((card.path === '/lfg/my-rsvps' || card.path === '/apps') && !user) return null
          return (
            <Link
              key={card.path}
              to={card.path}
              className="quick-access-card"
            >
              <span className="icon" style={{ color: card.color }}>
                {card.icon}
              </span>
              <span className="label">{card.label}</span>
              <span className="desc">{card.desc}</span>
              <div className="accent-line" style={{ background: card.color }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
