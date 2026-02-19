# Session Resilience Plan

## Context

Sessions expire after 1 hour with a fixed lifetime — no extension mechanism exists. The `extendSession()` function in `helpers.ts` is defined but **never called**. Additionally, `useVerifySession()` is never mounted in any component, so there is **no active session monitoring** — verification only runs during route navigation via `beforeLoad`. When a user switches tabs and returns after the session expires, they're immediately kicked to login.

The goal is to keep sessions alive as long as the user is active, and provide a 2-minute grace period for returning to a backgrounded tab after expiration.

## Changes

### 1. Simplify `extendSession` helper

**File:** `apps/backend/src/routers/auth/helpers.ts`

The current signature requires unused `accessToken`/`refreshToken` params. Simplify to just take `sessionToken`:

```typescript
export async function extendSession(sessionToken: string) {
  const expiresAt = new Date(Date.now() + MILLIS.HOUR)
  return db
    .update(usersSessions)
    .set({ expiresAt, updatedAt: sql`now()` })
    .where(eq(usersSessions.sessionToken, sessionToken))
}
```

### 2. Add expiration check + sliding window to middleware

**File:** `apps/backend/src/middlewares/auth.ts`

Currently the middleware only checks if the session exists — not if it's expired. Add:

- Expiration check (with 2-min grace period) → 401 if fully expired
- Sliding window: if session is past half-life (< 30 min remaining), extend it (fire-and-forget to avoid slowing requests)

```typescript
const sessionFound = await findSession(sessionToken)
if (!sessionFound) {
  throw new HTTPException(401, { message: MESSAGE.SESSION_NOT_FOUND })
}

const now = Date.now()
const expiresAtMs = sessionFound.expiresAt.getTime()
const GRACE_PERIOD = MILLIS.MINUTE * 2

if (expiresAtMs + GRACE_PERIOD < now) {
  throw new HTTPException(401, { message: MESSAGE.SESSION_EXPIRED })
}

// Sliding window: extend when past half-life or within grace period
if (expiresAtMs - now < MILLIS.HOUR / 2) {
  extendSession(sessionToken).catch(() => {})
}

c.set('session', sessionFound)
await next()
```

### 3. Add grace period to `/auth/session/verify`

**File:** `apps/backend/src/routers/auth/handlers.ts`

When the session is expired but within a 2-minute grace window, extend it and return 204 (success) instead of 401. This makes the tab-return scenario transparent to the user.

```typescript
.post('/session/verify', zValidatorThrow('json', getSessionSchema), async (c) => {
  const { sessionToken } = c.req.valid('json')
  const sessionFound = await findSession(sessionToken)
  if (!sessionFound) throw new HTTPException(401, { message: MESSAGE.SESSION_NOT_FOUND })

  if (isSessionExpired(sessionFound)) {
    const GRACE_PERIOD = MILLIS.MINUTE * 2
    const isWithinGrace = sessionFound.expiresAt.getTime() + GRACE_PERIOD > Date.now()

    if (isWithinGrace) {
      await extendSession(sessionToken)
      return new Response(null, { status: 204 })
    }

    throw new HTTPException(401, { message: MESSAGE.SESSION_EXPIRED })
  }

  // Sliding window on verify too
  const timeRemaining = sessionFound.expiresAt.getTime() - Date.now()
  if (timeRemaining < MILLIS.HOUR / 2) {
    await extendSession(sessionToken)
  }

  return new Response(null, { status: 204 })
})
```

### 4. Add `refetchInterval` to `useVerifySession`

**File:** `apps/frontend/src/hooks/queries/auth/useVerifySession.ts`

Add periodic polling so the session is actively monitored even when staying on one page:

```typescript
export function useVerifySession() {
  return useQuery({
    queryKey: ['verifiedSession'],
    queryFn: async () => await verifySession(),
    staleTime: MILLIS.SECOND * 25,
    refetchInterval: MILLIS.SECOND * 25,
  })
}
```

### 5. Create visibility change hook

**New file:** `apps/frontend/src/hooks/queries/auth/useSessionRevalidateOnFocus.ts`

Immediately re-verify the session when a backgrounded tab becomes visible (instead of waiting up to 25s for the next poll):

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useSessionRevalidateOnFocus() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['verifiedSession'] })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [queryClient])
}
```

### 6. Mount both hooks in `AuthLayoutComponent`

**File:** `apps/frontend/src/routes/_auth/route.tsx`

```typescript
function AuthLayoutComponent() {
  const { data: me, error } = useMe()
  const navigate = useNavigate()
  useVerifySession()
  useSessionRevalidateOnFocus()
  // ... rest unchanged
}
```

## How It Works Together

| Scenario                   | What happens                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| User actively working      | API calls hit middleware → sliding window extends session every time it passes half-life. Session never expires.                    |
| User on one page, idle     | `refetchInterval` polls `/session/verify` every 25s → verify extends session past half-life. Session never expires.                 |
| Tab backgrounded < 60 min  | Returns, visibility handler fires → verify call → session not yet expired, extended if past half-life.                              |
| Tab backgrounded 60–62 min | Returns, visibility handler fires → verify call → session expired but within 2-min grace → silently extended. User notices nothing. |
| Tab backgrounded > 62 min  | Returns, visibility handler fires → verify call → expired beyond grace → 401 → redirect to login.                                   |

## Verification

1. Log in, stay on a page for > 30 min → session should auto-extend (check `expiresAt` in DB)
2. Switch to another tab for 5 min, come back → should remain logged in
3. Manually set `expiresAt` to 1 min ago in DB → return to tab → should remain logged in (grace period)
4. Manually set `expiresAt` to 3 min ago in DB → return to tab → should redirect to login
