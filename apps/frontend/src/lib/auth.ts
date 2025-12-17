export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  isEnabled: boolean
  roles: string[]
}

export interface AuthSession {
  userId: string
  loginToken: string
  loginTokenExpires: string
  tenantId: string
  user?: UserProfile
}

const AUTH_SESSION_KEY = 'authSession'

/**
 * Get the current auth session from localStorage
 */
export function getAuthSession(): AuthSession | null {
  try {
    const session = localStorage.getItem(AUTH_SESSION_KEY)
    return session ? JSON.parse(session) : null
  } catch (error) {
    console.error('Failed to parse auth session:', error)
    return null
  }
}

/**
 * Store auth session in localStorage
 */
export function setAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Failed to store auth session:', error)
  }
}

/**
 * Clear auth session from localStorage
 */
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

/**
 * Check if the login token is expired
 */
export function isTokenExpired(loginTokenExpires: string): boolean {
  try {
    const expiryDate = new Date(loginTokenExpires)
    const now = new Date()
    return expiryDate <= now
  } catch (error) {
    console.error('Failed to parse token expiry date:', error)
    return true // Treat invalid dates as expired
  }
}

/**
 * Check if user is authenticated with a valid, non-expired token
 */
export function isAuthenticated(): boolean {
  const session = getAuthSession()
  if (!session) return false
  return !isTokenExpired(session.loginTokenExpires)
}

/**
 * Logout user by clearing session
 */
export function logout(): void {
  clearAuthSession()
}

/**
 * Redirect to legacy app login page
 * @param returnUrl - Optional URL to return to after login
 */
export function redirectToLogin(returnUrl?: string): void {
  clearAuthSession()

  const legacyAppUrl = import.meta.env.VITE_LEGACY_APP_URL || window.location.origin

  const currentUrl = returnUrl || window.location.href
  const loginUrl = `${legacyAppUrl}/login?returnUrl=${encodeURIComponent(currentUrl)}`

  window.location.href = loginUrl
}
