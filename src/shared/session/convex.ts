import { createContext, useContext } from "react"
import { convex } from "./client"

// The Convex side of the session. Convex holds one token fetcher and calls
// it again whenever it needs a token: on connect, and with a forced refresh
// ahead of expiry or when the server refuses one. A token is cached between
// those calls, which is what a reconnecting socket asks for.
//
// The token carries the active organization as a claim, so activating
// another organization needs a new one. Handing Convex the fetcher again
// swaps it in place: the socket pauses, authenticates with the fresh token,
// and resumes, and Convex reports nothing but the outcome. Nothing in React
// remounts or leaves the authenticated state while that happens.

type ConvexConnection = { isAuthenticated: boolean; isLoading: boolean }

export const ConvexConnectionContext = createContext<ConvexConnection>({
  isAuthenticated: false,
  isLoading: true,
})

export const useConvexConnection = () => useContext(ConvexConnectionContext)

let mint: (() => Promise<string | null>) | undefined
let report: ((isAuthenticated: boolean) => void) | undefined
let cached: string | null = null
let pending: Promise<string | null> | undefined

async function fetchToken({
  forceRefreshToken,
}: {
  forceRefreshToken: boolean
}) {
  if (cached !== null && !forceRefreshToken) {
    return cached
  }

  pending ??= (mint?.() ?? Promise.resolve(null))
    .catch(() => null)
    .then((token) => {
      cached = token
      pending = undefined

      return token
    })

  return await pending
}

/** Authenticates Convex with tokens minted by `mintToken`, reporting whether
 *  the server accepts them, now and after every later refresh. */
export function connectConvex(
  mintToken: () => Promise<string | null>,
  onChange: (isAuthenticated: boolean) => void
) {
  mint = mintToken
  report = onChange
  cached = null
  convex.setAuth(fetchToken, (isAuthenticated) => report?.(isAuthenticated))
}

export function disconnectConvex() {
  report = undefined
  cached = null
  convex.clearAuth()
}

/** Swaps the token for one minted from the session as it is now, resolving
 *  once Convex has accepted it. */
export function refreshConvexToken() {
  cached = null

  return new Promise<void>((resolve, reject) => {
    convex.setAuth(fetchToken, (isAuthenticated) => {
      report?.(isAuthenticated)

      if (isAuthenticated) {
        resolve()
      } else {
        reject(new Error("Convex refused the refreshed session."))
      }
    })
  })
}
