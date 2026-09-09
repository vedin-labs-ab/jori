import { parseShareFragment } from "@contracts/shares/fragment"
import { useRouterState } from "@tanstack/react-router"
import { useEffect, useState, useSyncExternalStore } from "react"

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange)

  return () => window.removeEventListener("hashchange", onChange)
}

function readShareSecret() {
  return parseShareFragment(window.location.hash)
}

/** Fragments never reach the server, so the first render of a page the
 *  server sent cannot know the secret: undefined while deciding, null for
 *  the member view, or the share secret. Every later render reads the hash
 *  synchronously, so navigating to a material inside the app resolves in
 *  the same commit rather than flashing a loading state first. */
export function useShareSecret() {
  // Router pushes and replacements do not dispatch native hashchange events.
  // Subscribe to the route hash too, including edits on the same detail URL.
  useRouterState({ select: (state) => state.location.hash })

  return useSyncExternalStore(subscribeToHash, readShareSecret, readNoSecret)
}

function readNoSecret() {
  return undefined
}

/** Reactive queries empty on revocation by themselves; expiry needs a clock.
 *  Flips once the link's expiry passes so an open page closes itself. */
export function useShareExpired(expiresAt: number | undefined) {
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (expiresAt === undefined) {
      setIsExpired(false)

      return
    }

    const update = () => setIsExpired(Date.now() >= expiresAt)

    update()

    const remainingMs = expiresAt - Date.now()

    if (remainingMs <= 0) {
      return
    }

    const timeout = window.setTimeout(update, remainingMs + 1000)

    return () => window.clearTimeout(timeout)
  }, [expiresAt])

  return isExpired
}
