import { useCallback, useEffect, useRef, useState } from 'react'

const BOARD_SIZE = 8
const CELL_SIZE = 60
const PIECE_RADIUS = 22
const KING_RADIUS = 8

// Piece constants (must match backend: EMPTY=0, BLACK=1, RED=2, BLACK_KING=3, RED_KING=4)
const EMPTY = 0
const BLACK = 1
const BLACK_KING = 3
const RED_KING = 4

function getWebSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_GAME_API_URL ?? ''
  if (apiUrl.startsWith('http://')) {
    return apiUrl.replace('http://', 'ws://') + '/ws/checkers/'
  }
  if (apiUrl.startsWith('https://')) {
    return apiUrl.replace('https://', 'wss://') + '/ws/checkers/'
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/checkers/`
}

interface GameState {
  board: number[][]
  currentTurn: string
  myColor: string | null
  winner: string | null
  validMoves: { from: number[]; to: number[] }[]
  mustContinue?: number[] | null
}

export default function Checkers() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [selected, setSelected] = useState<[number, number] | null>(null)

  const connect = useCallback(() => {
    const url = getWebSocketUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus('connected')
    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('disconnected')

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'state') {
          const mc = msg.mustContinue ?? null
          setState({
            board: msg.board,
            currentTurn: msg.currentTurn,
            myColor: msg.myColor ?? null,
            winner: msg.winner ?? null,
            validMoves: msg.validMoves ?? [],
            mustContinue: mc,
          })
          setSelected(mc && Array.isArray(mc) && mc.length >= 2 ? [mc[0], mc[1]] : null)
        }
      } catch {
        // ignore
      }
    }

  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const sendMove = useCallback((from: [number, number], to: [number, number]) => {
    wsRef.current?.send(
      JSON.stringify({ type: 'move', from, to })
    )
  }, [])

  const sendReset = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'reset' }))
    setSelected(null)
  }, [])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!state || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const scaleX = canvasRef.current.width / rect.width
      const scaleY = canvasRef.current.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      const col = Math.floor(x / CELL_SIZE)
      const row = Math.floor(y / CELL_SIZE)
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return

      const validForFrom = state.validMoves.filter(
        (m) => m.from[0] === row && m.from[1] === col
      )
      const validForTo = selected
        ? state.validMoves.filter(
            (m) =>
              m.from[0] === selected[0] &&
              m.from[1] === selected[1] &&
              m.to[0] === row &&
              m.to[1] === col
          )
        : []

      if (validForTo.length > 0) {
        sendMove([selected![0], selected![1]], [row, col])
        setSelected(null)
      } else if (validForFrom.length > 0) {
        setSelected([row, col])
      } else {
        setSelected(null)
      }
    },
    [state, selected, sendMove]
  )

  // Draw board and pieces
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = BOARD_SIZE * CELL_SIZE
    canvas.width = size
    canvas.height = size

    // Board
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const isDark = (row + col) % 2 === 1
        ctx.fillStyle = isDark ? '#2d5016' : '#e8dcc4'
        ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    // Valid move highlights
    if (selected) {
      const moves = state.validMoves.filter(
        (m) => m.from[0] === selected[0] && m.from[1] === selected[1]
      )
      ctx.fillStyle = 'rgba(99, 102, 241, 0.4)'
      for (const m of moves) {
        ctx.beginPath()
        ctx.arc(
          m.to[1] * CELL_SIZE + CELL_SIZE / 2,
          m.to[0] * CELL_SIZE + CELL_SIZE / 2,
          PIECE_RADIUS + 4,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }
    }

    // Selection highlight
    if (selected) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3
      ctx.strokeRect(
        selected[1] * CELL_SIZE + 2,
        selected[0] * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      )
    }

    // Pieces
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = state.board[row][col]
        if (piece === EMPTY) continue

        const cx = col * CELL_SIZE + CELL_SIZE / 2
        const cy = row * CELL_SIZE + CELL_SIZE / 2

        const isBlack = piece === BLACK || piece === BLACK_KING
        ctx.fillStyle = isBlack ? '#1a1a1a' : '#c41e3a'
        ctx.strokeStyle = isBlack ? '#333' : '#8b0000'
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        if (piece === BLACK_KING || piece === RED_KING) {
          ctx.fillStyle = '#d4af37'
          ctx.beginPath()
          ctx.arc(cx, cy, KING_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [state, selected])

  const canMove = state?.myColor && state.currentTurn === state.myColor && !state.winner

  return (
    <div className="card" style={{ marginTop: '1rem', maxWidth: 'fit-content' }}>
      <h1 style={{ marginTop: 0 }}>Checkers</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        First player to join is <strong>black</strong> and moves first. Open in two browser tabs to play.
      </p>

      {status === 'connecting' && (
        <p style={{ color: 'var(--text-muted)' }}>Connecting…</p>
      )}
      {status === 'disconnected' && (
        <p>
          <span className="badge badge-error">Disconnected</span>{' '}
          <button type="button" onClick={connect}>
            Reconnect
          </button>
        </p>
      )}

      {state && status === 'connected' && (
        <>
          <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {state.myColor && (
              <span style={{ color: 'var(--text-muted)' }}>
                You are <strong style={{ color: state.myColor === 'black' ? '#1a1a1a' : '#c41e3a' }}>{state.myColor}</strong>
              </span>
            )}
            {state.winner ? (
              <span className="badge badge-ok">
                {state.winner === state.myColor ? 'You win!' : `${state.winner} wins!`}
              </span>
            ) : canMove ? (
              <span className="badge badge-ok">
                {state.mustContinue ? 'Continue jumping!' : 'Your turn'}
              </span>
            ) : state.myColor ? (
              <span style={{ color: 'var(--text-muted)' }}>Waiting for opponent…</span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Spectating (2 players already in game)</span>
            )}
            <button type="button" onClick={sendReset} style={{ marginLeft: 'auto' }}>
              New Game
            </button>
          </div>

          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              cursor: canMove ? 'pointer' : 'default',
              display: 'block',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          />
        </>
      )}
    </div>
  )
}
