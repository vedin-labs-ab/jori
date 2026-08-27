// A share link is a material's console URL plus a secret carried in the URL
// fragment. Fragments never leave the browser in requests, so the secret
// stays out of server logs, proxies, and link-scanner fetches.

const shareFragmentKey = "share"

export function shareFragment(secret: string) {
  return `${shareFragmentKey}=${encodeURIComponent(secret)}`
}

export function parseShareFragment(hash: string) {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash
  const secret = new URLSearchParams(fragment).get(shareFragmentKey)

  return secret === null || secret === "" ? null : secret
}
