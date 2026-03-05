/**
 * Base URL for Discord OAuth (authorize/link). Prefer VITE_DISCORD_AUTHORIZE_URL, else VITE_API_URL.
 * Never returns a localhost URL when the app is not running on localhost (avoids wrong .env on production).
 */
function getDiscordAuthBase(): string {
  const base = (
    import.meta.env.VITE_DISCORD_AUTHORIZE_URL
      ? String(import.meta.env.VITE_DISCORD_AUTHORIZE_URL)
      : String(import.meta.env.VITE_API_URL ?? '')
  ).trim()
  if (typeof window !== 'undefined') {
    const isLocalhost = /localhost|127\.0\.0\.1/.test(base)
    const appOnLocalhost = /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)
    if (isLocalhost && !appOnLocalhost) return ''
  }
  return base
}

/** Full URL for Discord login authorize (used on Login/Signup). */
export function getDiscordAuthorizeUrl(): string {
  const base = getDiscordAuthBase()
  const path = '/api/v1/auth/discord/authorize/'
  return (base ? `${base}${path}` : path).trim() || path
}

/** Full URL for Discord account link authorize (used on My Account). */
export function getDiscordLinkAuthorizeUrl(): string {
  const base = getDiscordAuthBase()
  const path = '/api/v1/auth/discord/link/authorize/'
  return (base ? `${base}${path}` : path).trim() || path
}
