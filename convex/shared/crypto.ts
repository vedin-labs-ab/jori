import {
  base64EncodeBytes,
  bytesToHex,
  copyBytesToArrayBuffer,
} from "./encoding"

// Compares secrets in constant time so the comparison itself never leaks
// how much of an attacker's guess matched.
export function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false
  }

  let difference = 0

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return difference === 0
}

/** Lowercase hex SHA-256 of a UTF-8 string. */
export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )

  return bytesToHex(new Uint8Array(digest))
}

/** Lowercase hex HMAC-SHA-256 of a UTF-8 string with a UTF-8 secret. */
export async function hmacSha256Hex(secret: string, value: string) {
  return bytesToHex(await hmacSha256(new TextEncoder().encode(secret), value))
}

/** Base64 HMAC-SHA-256 of a UTF-8 string with a binary secret. */
export async function hmacSha256Base64(secret: Uint8Array, value: string) {
  return base64EncodeBytes(await hmacSha256(secret, value))
}

async function hmacSha256(secret: Uint8Array, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    copyBytesToArrayBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  )

  return new Uint8Array(signature)
}
