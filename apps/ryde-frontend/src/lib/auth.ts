export const AUTH_COOKIE_NAME = "ryde-auth-token"

export type JwtPayload = {
  role: string
  iat: number
  exp: number
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1]!
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function getJwtFromCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_COOKIE_NAME}=`))
  return match ? match.split("=")[1] ?? null : null
}

export function setJwtCookie(jwt: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${AUTH_COOKIE_NAME}=${jwt}; path=/; max-age=28800; SameSite=Lax${secure}`
}

export function clearJwtCookie(): void {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}
