import { parseShareFragment } from "@contracts/shares/fragment"
import { useEffect, useState } from "react"

/** Fragments only exist client-side, so resolve after mount: undefined while
 *  deciding, null for the member view, or the share secret. */
export function useShareSecret() {
  const [secret, setSecret] = useState<string | null>()

  useEffect(() => {
    const update = () => setSecret(parseShareFragment(window.location.hash))

    update()
    window.addEventListener("hashchange", update)

    return () => window.removeEventListener("hashchange", update)
  }, [])

  return secret
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
