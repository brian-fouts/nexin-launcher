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

function getWebSocketUrl(): string {
  const apiUrl = (import.meta.env.VITE_GAME_API_URL ?? '').trim()
  if (apiUrl.startsWith('http://')) {
    return apiUrl.replace('http://', 'ws://').replace(/\/$/, '') + '/ws/checkers/'
  }
  if (apiUrl.startsWith('https://')) {
    return apiUrl.replace('https://', 'wss://').replace(/\/$/, '') + '/ws/checkers/'
  }
  // Same-origin: use current host (Vite proxy or nginx will forward /ws to game-backend)
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
  const [searchParams] = useSearchParams()
  const { setUser } = useAuth()
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
    if (!ticket || loginAttemptedRef.current) return
    loginAttemptedRef.current = true
    gameApi
      .login(ticket, serverId)
      .then((data) => {
        setUser(serverId ? { ...data, server_id: serverId } : data)
      })
      .catch(() => {
        // Ignore; user can still play checkers without matchmaker presence
      })
  }, [searchParams, setUser])

  const connect = useCallback(() => {
    const url = getWebSocketUrl()
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

    // Board
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const isDark = (row + col) % 2 === 1
        ctx.fillStyle = isDark ? '#2d5016' : '#e8dcc4'
        ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    const drawPiece = (cx: number, cy: number, piece: number, shadow = false) => {
      const isBlack = piece === BLACK || piece === BLACK_KING
      ctx.fillStyle = isBlack ? '#1a1a1a' : '#c41e3a'
      ctx.strokeStyle = isBlack ? '#333' : '#8b0000'
      ctx.lineWidth = 2
      if (shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetY = 2
      }
      const isKing = piece === BLACK_KING || piece === RED_KING
      if (isKing) {
        ctx.beginPath()
        ctx.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy - KING_STACK_OFFSET, PIECE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
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
        drawPiece(cx, cy, piece)
      }
    }

    // Dragged piece (drawn at cursor, with slight elevation)
    if (dragState) {
      const { piece, offsetX, offsetY } = dragState
      drawPiece(offsetX, offsetY, piece, true)
    }
  }, [state, selected, dragState])

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

          <div style={{ position: 'relative', display: 'inline-block' }}>
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
                border: '1px solid var(--border)',
              }}
            />
            {/* HTML overlay for highlights - updates immediately with React, no canvas redraw delay */}
            {(selected ?? dragState?.from) && state && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
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
                        left: m.to[1] * CELL_SIZE + CELL_SIZE / 2 - (PIECE_RADIUS + 4),
                        top: m.to[0] * CELL_SIZE + CELL_SIZE / 2 - (PIECE_RADIUS + 4),
                        width: (PIECE_RADIUS + 4) * 2,
                        height: (PIECE_RADIUS + 4) * 2,
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.4)',
                      }}
                    />
                  ))}
                {selected && !dragState && (
                  <div
                    style={{
                      position: 'absolute',
                      left: selected[1] * CELL_SIZE + 2,
                      top: selected[0] * CELL_SIZE + 2,
                      width: CELL_SIZE - 4,
                      height: CELL_SIZE - 4,
                      borderRadius: 4,
                      border: '3px solid #6366f1',
                      boxSizing: 'border-box',
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
