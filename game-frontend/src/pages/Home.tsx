import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h1 style={{ marginTop: 0 }}>Nexin Game</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        This app connects to the game-backend service. Use the launcher to open the game with a
        one-time ticket; the game-backend will validate the ticket and identify you.
      </p>
      <p>
        <Link to="/health" style={{ color: 'var(--accent)' }}>
          Check game API health →
        </Link>
      </p>
    </div>
  )
}
