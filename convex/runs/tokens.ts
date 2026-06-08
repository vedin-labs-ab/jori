export function createExecutionToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return base64UrlEncode(bytes)
}

export async function hashExecutionToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

function base64UrlEncode(bytes: Uint8Array) {
  let value = ""

  for (const byte of bytes) {
    value += String.fromCharCode(byte)
  }

  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}
