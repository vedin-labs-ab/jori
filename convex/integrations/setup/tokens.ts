import { base64EncodeBytes } from "../../shared/encoding"

export function createSetupToken() {
  const bytes = new Uint8Array(32)

  crypto.getRandomValues(bytes)

  return base64Url(base64EncodeBytes(bytes))
}

export async function hashSetupToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function base64Url(value: string) {
  return value.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}
