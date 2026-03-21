/*
 * This is a helper library to integrate this app with Aegis authentication system.
 * Use functions in this library for authentication needs.
 * There are API endpoints in this app that use these functions that may be used
 * - /api/me: Get currently logged in user
 * Also see auth.client.ts for usages in client components.
 */
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'aegis_session'

export interface User {
  id: string
  email: string
  username: string
  first_name?: string
  last_name?: string
}

// Build absolute verify URL based on incoming request
function getVerifyUrl(req: Request) {
  const host = req.headers.get("host");
  if (!host) throw new Error("Missing host header");

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/__aegis__/verify`;
}

/* -------------------------------------------------------------------------- */
/*                                  Cookies                                   */
/* -------------------------------------------------------------------------- */

export async function getSessionCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/* -------------------------------------------------------------------------- */
/*                               Main Function                                */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser(req: Request): Promise<User | null> {
  const sessionCookie = await getSessionCookie()
  if (!sessionCookie) return null

  const verifyUrl = getVerifyUrl(req);

  try {
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 
        'Cookie': `${SESSION_COOKIE}=${sessionCookie}`
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return null
    }

    const user = await res.json()
    if (!user?.user) return null

    return user.user
  } catch (err) {
    console.error('Failed to verify session:', err)
    return null
  }
}
