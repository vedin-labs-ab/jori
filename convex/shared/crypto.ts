import { bytesToHex } from "./encoding"

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
