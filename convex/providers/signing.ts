export async function createSignedState<State>(secret: string, state: State) {
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(state))
  )
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

  return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as State
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

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

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

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

function base64UrlDecode(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/")
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  )
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}
