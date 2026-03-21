/*
 * Helper functions for APIs that use auth.server.ts.
 * Use these functions in client component for authentication needs i.e.
 * getting current user and logging user out.
 */
import type { User } from './auth.server'

/**
 * Client reads current user by hitting the API.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/me', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.user ?? null
  } catch {
    return null
  }
}

export function redirectToLogin() {
  window.location.href = '/__aegis__/login'
}

export function redirectToRegister() {
  window.location.href = '/__aegis__/register'
}

export function redirectToLogout() {
  window.location.href = '/__aegis__/logout'
}
