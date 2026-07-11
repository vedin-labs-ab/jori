// A share link is an artifact's console URL plus a secret carried in the URL
// fragment. Fragments never leave the browser in requests, so the secret
// stays out of server logs, proxies, and link-scanner fetches.

const shareFragmentKey = "share"

export const shareExpiry = {
  minHours: 1,
  defaultHours: 72,
  maxHours: 168,
} as const

export function shareFragment(secret: string) {
  return `${shareFragmentKey}=${encodeURIComponent(secret)}`
}

export function parseShareFragment(hash: string) {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash
  const secret = new URLSearchParams(fragment).get(shareFragmentKey)

  return secret === null || secret === "" ? null : secret
}

/**
 * The non-secret fragment params: view state a link addresses inside the
 * artifact page. The console forwards these onto the frame's own fragment —
 * the page runs cross-origin and cannot read the console URL.
 */
export function viewFragment(hash: string) {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash
  const params = new URLSearchParams(fragment)

  params.delete(shareFragmentKey)

  const view = params.toString()

  return view === "" ? null : view
}

export function shareExpiresAt(now: number, expiresInHours?: number) {
  return now + clampShareExpiryHours(expiresInHours) * 60 * 60 * 1000
}

export function clampShareExpiryHours(hours: number | undefined) {
  if (hours === undefined || Number.isNaN(hours)) {
    return shareExpiry.defaultHours
  }

  return Math.min(shareExpiry.maxHours, Math.max(shareExpiry.minHours, hours))
}
