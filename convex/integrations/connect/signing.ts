import { timingSafeEqual } from "../../shared/crypto"
import {
  base64UrlDecodeBytes,
  base64UrlEncode,
  bytesToHex,
} from "../../shared/encoding"

export async function createSignedState<State>(secret: string, state: State) {
  const payload = base64UrlEncode(JSON.stringify(state))
  const signature = await hmacSha256Hex(secret, payload)

  return `${payload}.${signature}`
}

export async function parseSignedState<State>(args: {
  secret: string
  value: string
  errorLabel: string
}) {
  const [payload, signature] = args.value.split(".")

  if (payload === undefined || signature === undefined) {
    throw new Error(`Invalid ${args.errorLabel} state`)
  }

  const expectedSignature = await hmacSha256Hex(args.secret, payload)

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error(`Invalid ${args.errorLabel} state signature`)
  }

  return JSON.parse(
    new TextDecoder().decode(base64UrlDecodeBytes(payload))
  ) as State
}

export async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  )

  return bytesToHex(new Uint8Array(signature))
}
