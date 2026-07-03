import { base64UrlEncodeBytes } from "../../shared/encoding"

export function createIntegrationOfferToken() {
  const bytes = new Uint8Array(32)

  crypto.getRandomValues(bytes)

  return base64UrlEncodeBytes(bytes)
}

export async function hashIntegrationOfferToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
