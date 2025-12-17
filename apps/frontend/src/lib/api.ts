/**
 * Hono RPC Client Configuration
 *
 * This file sets up a typed Hono RPC client for communicating with the backend API.
 * It provides full type inference for all API endpoints.
 */

import type { AppType } from '@repo/backend/app'
import { hc } from 'hono/client'
import { getAuthSession, redirectToLogin } from './auth'
import { CLIENT_ENV } from './env'

/**
 * Gets authentication headers from localStorage
 */
function getAuthHeaders(): Record<string, string> {
  const authSession = getAuthSession()

  return {
    'Content-Type': 'application/json',
    Authorization: authSession ? `Bearer ${authSession.loginToken}` : '',
  }
}

/**
 * Check if an error is an authentication error
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status === 401 || error.status === 403
  }
  return false
}

/**
 * Create the typed Hono RPC client
 */
export const api = hc<AppType>(CLIENT_ENV.VITE_API_URL, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const authHeaders = getAuthHeaders()
    const headers = new Headers(init?.headers)
    Object.entries(authHeaders).forEach(([key, value]) => {
      if (value) headers.set(key, value)
    })

    try {
      const res = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      })

      if (!res.ok && isAuthError(res)) {
        redirectToLogin()
        return new Promise(() => {})
      }

      return res
    } catch (error) {
      if (isAuthError(error)) {
        redirectToLogin()
        return new Promise(() => {})
      }
      throw error
    }
  },
})

/**
 * Helper function to handle API errors consistently
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}
