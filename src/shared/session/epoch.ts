import { useSyncExternalStore } from "react"

// The Convex token carries the active organization claim, and the provider
// that fetches it keeps the one it has for the life of its mount. Activating
// another organization therefore starts the connection over: the provider
// remounts on a new epoch and fetches a token minted for the new claim. It
// happens in place, so no page load stands between two organizations.

let epoch = 0
const listeners = new Set<() => void>()

export function reconnect() {
  epoch += 1

  for (const listener of listeners) {
    listener()
  }
}

export function useConnectionEpoch() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => epoch,
    () => 0
  )
}
