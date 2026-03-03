import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { gameApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const BOARD_SIZE = 8
const CELL_SIZE = 60
const CANVAS_SIZE = BOARD_SIZE * CELL_SIZE
const PIECE_RADIUS = 22
const KING_STACK_OFFSET = 10  // vertical offset for stacked king (second piece)

// Piece constants (must match backend: EMPTY=0, BLACK=1, RED=2, BLACK_KING=3, RED_KING=4)
const EMPTY = 0
const BLACK = 1
const BLACK_KING = 3
const RED_KING = 4

function getWebSocketUrl(roomId: string | null): string {
  const base = (() => {
    const apiUrl = (import.meta.env.VITE_GAME_API_URL ?? '').trim()
    if (apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'ws://').replace(/\/$/, '') + '/ws/checkers/'
    }
    if (apiUrl.startsWith('https://')) {
      return apiUrl.replace('https://', 'wss://').replace(/\/$/, '') + '/ws/checkers/'
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws/checkers/`
  })()
  if (roomId && roomId.trim()) {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}room_id=${encodeURIComponent(roomId.trim())}`
  }
  return base
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
  const [searchParams] = useSearchParams()
  const { user, setUser } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [dragState, setDragState] = useState<{
    from: [number, number]
    piece: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const mouseDownRef = useRef<{ from: [number, number]; piece: number; x: number; y: number } | null>(null)
  const loginAttemptedRef = useRef(false)

  // Validate ticket and report to matchmaker when joining via matchmaker link
  useEffect(() => {
    const ticket = searchParams.get('ticket')
    const serverId = searchParams.get('server_id') ?? undefined
    const roomId = searchParams.get('room_id') ?? undefined
    if (!ticket || loginAttemptedRef.current) return
    loginAttemptedRef.current = true
    gameApi
      .login(ticket, serverId)
      .then((data) => {
        setUser(serverId ? { ...data, server_id: serverId, room_id: roomId } : { ...data, room_id: roomId })
      })
      .catch(() => {
        // Ignore; user can still play checkers without matchmaker presence
      })
  }, [searchParams, setUser])

  const roomId = searchParams.get('room_id') ?? user?.room_id ?? undefined

  const connect = useCallback(() => {
    const url = getWebSocketUrl(roomId ?? null)
    if (import.meta.env.DEV) {
      console.log('[Checkers] Connecting to WebSocket:', url)
    }
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus('connected')
    ws.onclose = (e) => {
      if (import.meta.env.DEV && e.code !== 1000) {
        console.warn('[Checkers] WebSocket closed:', e.code, e.reason || 'No reason')
      }
      setStatus('disconnected')
    }
    ws.onerror = () => {
      if (import.meta.env.DEV) {
        console.error('[Checkers] WebSocket error connecting to:', url)
      }
      setStatus('disconnected')
    }

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

  }, [roomId ?? null])

  // Send identify with user_id once connected and we have user (for matchmaker room status)
  useEffect(() => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN && user?.user_id) {
      ws.send(JSON.stringify({ type: 'identify', user_id: user.user_id }))
    }
  }, [status, user?.user_id])

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
    setDragState(null)
  }, [])

  const getCanvasCoords = useCallback((e: { clientX: number; clientY: number }) => {
    if (!canvasRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      row: Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE),
      col: Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE),
    }
  }, [])

  const canMove = state?.myColor && state.currentTurn === state.myColor && !state.winner

  const tryMove = useCallback(
    (from: [number, number], toRow: number, toCol: number) => {
      if (!state) return false
      const valid = state.validMoves.some(
        (m) => m.from[0] === from[0] && m.from[1] === from[1] && m.to[0] === toRow && m.to[1] === toCol
      )
      if (valid) {
        sendMove(from, [toRow, toCol])
        setSelected(null)
        setDragState(null)
        return true
      }
      return false
    },
    [state, sendMove]
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!state || !canvasRef.current) return
      const coords = getCanvasCoords(e)
      if (!coords) return
      const { row, col } = coords
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
        tryMove([selected![0], selected![1]], row, col)
      } else if (validForFrom.length > 0) {
        setSelected([row, col])
      } else {
        setSelected(null)
      }
    },
    [state, selected, getCanvasCoords, tryMove]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!state || !canMove) return
      e.preventDefault()
      const coords = getCanvasCoords(e)
      if (!coords) return
      const { row, col } = coords
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return

      const validForFrom = state.validMoves.filter(
        (m) => m.from[0] === row && m.from[1] === col
      )
      if (validForFrom.length > 0) {
        const piece = state.board[row][col]
        mouseDownRef.current = { from: [row, col], piece, x: coords.x, y: coords.y }
        setSelected([row, col])
      }
    },
    [state, canMove, getCanvasCoords]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e)
      if (!coords) return

      if (dragState) {
        setDragState((prev) =>
          prev ? { ...prev, offsetX: coords.x, offsetY: coords.y } : null
        )
      } else if (mouseDownRef.current) {
        const dx = coords.x - mouseDownRef.current.x
        const dy = coords.y - mouseDownRef.current.y
        if (dx * dx + dy * dy > 16) {
          setDragState({
            from: mouseDownRef.current.from,
            piece: mouseDownRef.current.piece,
            offsetX: coords.x,
            offsetY: coords.y,
          })
          mouseDownRef.current = null
        }
      }
    },
    [dragState, getCanvasCoords]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      mouseDownRef.current = null
      if (!dragState || !state) return
      const coords = getCanvasCoords(e)
      if (!coords) {
        setDragState(null)
        return
      }
      const { row, col } = coords
      const droppedOnValid = row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE &&
        tryMove(dragState.from, row, col)
      if (!droppedOnValid) {
        setSelected(dragState.from)
      }
      setDragState(null)
    },
    [dragState, state, getCanvasCoords, tryMove]
  )

  const handleMouseLeave = useCallback(() => {
    mouseDownRef.current = null
    if (dragState) setDragState(null)
  }, [dragState])

  // Cancel drag if mouse is released outside canvas
  useEffect(() => {
    if (!dragState) return
    const onGlobalMouseUp = () => {
      mouseDownRef.current = null
      setDragState(null)
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [dragState])

  // Draw board and pieces (including dragged piece)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE

    // Board squares with gradients (felt/baize look)
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const x = col * CELL_SIZE
        const y = row * CELL_SIZE
        const isDark = (row + col) % 2 === 1
        let grad: CanvasGradient
        if (isDark) {
          grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE)
          grad.addColorStop(0, '#1a3310')
          grad.addColorStop(0.4, '#2a5c18')
          grad.addColorStop(1, '#143308')
        } else {
          grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE)
          grad.addColorStop(0, '#f8f2e4')
          grad.addColorStop(0.5, '#e8dcc4')
          grad.addColorStop(1, '#d9c9a8')
        }
        ctx.fillStyle = grad
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
      }
    }

    const drawPiece = (cx: number, cy: number, piece: number, shadow = false) => {
      const isBlack = piece === BLACK || piece === BLACK_KING
      const isKing = piece === BLACK_KING || piece === RED_KING

      if (shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)'
        ctx.shadowBlur = 14
        ctx.shadowOffsetY = 4
      }

      const drawOneDisk = (px: number, py: number) => {
        const r = PIECE_RADIUS
        // Main body: radial gradient for glossy sphere
        const bodyGrad = ctx.createRadialGradient(px - r * 0.4, py - r * 0.4, 0, px, py, r * 1.2)
        if (isBlack) {
          bodyGrad.addColorStop(0, '#4a4a4a')
          bodyGrad.addColorStop(0.25, '#2a2a2a')
          bodyGrad.addColorStop(0.7, '#0f0f0f')
          bodyGrad.addColorStop(1, '#1a1a1a')
        } else {
          bodyGrad.addColorStop(0, '#ff6b6b')
          bodyGrad.addColorStop(0.2, '#e63939')
          bodyGrad.addColorStop(0.6, '#b91c1c')
          bodyGrad.addColorStop(1, '#7f1d1d')
        }
        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
        // Rim highlight
        ctx.strokeStyle = isBlack ? 'rgba(120,120,120,0.6)' : 'rgba(255,200,200,0.7)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        // Specular highlight (top-left)
        const specGrad = ctx.createRadialGradient(
          px - r * 0.5, py - r * 0.5, 0,
          px - r * 0.5, py - r * 0.5, r * 0.9
        )
        specGrad.addColorStop(0, 'rgba(255,255,255,0.5)')
        specGrad.addColorStop(0.4, 'rgba(255,255,255,0.1)')
        specGrad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = specGrad
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (isKing) {
        drawOneDisk(cx, cy)
        drawOneDisk(cx, cy - KING_STACK_OFFSET)
      } else {
        drawOneDisk(cx, cy)
      }

      if (shadow) {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }
    }

    // Pieces (skip the one being dragged)
    const [dragRow, dragCol] = dragState?.from ?? [-1, -1]
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (row === dragRow && col === dragCol) continue
        const piece = state.board[row][col]
        if (piece === EMPTY) continue
        const cx = col * CELL_SIZE + CELL_SIZE / 2
        const cy = row * CELL_SIZE + CELL_SIZE / 2
        // Drop shadow under piece
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = 6
        ctx.shadowOffsetY = 2
        drawPiece(cx, cy, piece)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }
    }

    // Dragged piece (drawn at cursor, with slight elevation)
    if (dragState) {
      const { piece, offsetX, offsetY } = dragState
      drawPiece(offsetX, offsetY, piece, true)
    }
  }, [state, selected, dragState])

  return (
    <div
      className="card"
      style={{
        marginTop: '1rem',
        maxWidth: 'fit-content',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <h1 style={{ marginTop: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>Checkers</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
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
          <div
            style={{
              marginBottom: '1rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {state.myColor && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
                You are <strong style={{ color: state.myColor === 'black' ? '#2d2d2d' : '#b91c1c' }}>{state.myColor}</strong>
              </span>
            )}
            {state.winner ? (
              <span
                className="badge badge-ok"
                style={{ boxShadow: '0 2px 8px rgba(34,197,94,0.3)', fontWeight: 600 }}
              >
                {state.winner === state.myColor ? 'You win!' : `${state.winner} wins!`}
              </span>
            ) : canMove ? (
              <span
                className="badge badge-ok"
                style={{ boxShadow: '0 2px 8px rgba(34,197,94,0.25)', fontWeight: 500 }}
              >
                {state.mustContinue ? 'Continue jumping!' : 'Your turn'}
              </span>
            ) : state.myColor ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Waiting for opponent…</span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Spectating (2 players already in game)</span>
            )}
            <button
              type="button"
              onClick={sendReset}
              style={{
                marginLeft: 'auto',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
              }}
            >
              New Game
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 8,
              background: 'linear-gradient(145deg, #3d2914 0%, #2d1a0a 100%)',
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{
                cursor: canMove ? (dragState ? 'grabbing' : 'grab') : 'default',
                display: 'block',
                borderRadius: 8,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
              }}
            />
            {/* HTML overlay for highlights - updates immediately with React */}
            {(selected ?? dragState?.from) && state && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: CANVAS_SIZE,
                  height: CANVAS_SIZE,
                  pointerEvents: 'none',
                  borderRadius: 8,
                }}
              >
                {state.validMoves
                  .filter(
                    (m) =>
                      m.from[0] === (selected ?? dragState!.from)[0] &&
                      m.from[1] === (selected ?? dragState!.from)[1]
                  )
                  .map((m, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: m.to[1] * CELL_SIZE + CELL_SIZE / 2 - (PIECE_RADIUS + 6),
                        top: m.to[0] * CELL_SIZE + CELL_SIZE / 2 - (PIECE_RADIUS + 6),
                        width: (PIECE_RADIUS + 6) * 2,
                        height: (PIECE_RADIUS + 6) * 2,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(129,140,248,0.5), rgba(99,102,241,0.35))',
                        boxShadow: '0 0 20px rgba(99,102,241,0.4), inset 0 0 12px rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                {selected && !dragState && (
                  <div
                    style={{
                      position: 'absolute',
                      left: selected[1] * CELL_SIZE + 3,
                      top: selected[0] * CELL_SIZE + 3,
                      width: CELL_SIZE - 6,
                      height: CELL_SIZE - 6,
                      borderRadius: 6,
                      border: '3px solid rgba(250,204,21,0.9)',
                      boxSizing: 'border-box',
                      boxShadow: '0 0 16px rgba(250,204,21,0.5), inset 0 0 8px rgba(250,204,21,0.15)',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
