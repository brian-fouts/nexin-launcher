/**
 * Game frontend base URL for opening the game client (Create room / Join).
 * Uses VITE_GAME_FRONTEND_URL from the environment when set; otherwise the value from the API.
 */
export function getGameFrontendBase(apiBase: string | null | undefined): string {
  const fromEnv = (import.meta.env.VITE_GAME_FRONTEND_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const raw = (apiBase ?? '').trim().replace(/\/$/, '')
  return raw
}
