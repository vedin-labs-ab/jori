const slackSigningSecret = process.env.SLACK_SIGNING_SECRET

export type SlackInstallState = {
  tenantId: string
  createdBy: string
  returnUrl: string
  createdAt: number
}

export function requireSlackSigningSecret() {
  if (slackSigningSecret === undefined) {
    throw new Error("Missing SLACK_SIGNING_SECRET")
  }

  return slackSigningSecret
}

export async function createSignedSlackState(state: SlackInstallState) {
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(state))
  )
  const signature = await hmacSha256Hex(requireSlackSigningSecret(), payload)

  return `${payload}.${signature}`
}

export async function parseSignedSlackState(value: string) {
  const [payload, signature] = value.split(".")

  if (payload === undefined || signature === undefined) {
    throw new Error("Invalid Slack state")
  }

  const expectedSignature = await hmacSha256Hex(
    requireSlackSigningSecret(),
    payload
  )

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error("Invalid Slack state signature")
  }

  return JSON.parse(
    new TextDecoder().decode(base64UrlDecode(payload))
  ) as SlackInstallState
}

export async function verifySlackRequest(request: Request, body: string) {
  const timestamp = request.headers.get("x-slack-request-timestamp")
  const signature = request.headers.get("x-slack-signature")

  if (timestamp === null || signature === null) {
    return false
  }

  const seconds = Number(timestamp)

  if (!Number.isFinite(seconds)) {
    return false
  }

  const requestAge = Math.abs(Date.now() / 1000 - seconds)

  if (requestAge > 60 * 5) {
    return false
  }

  const base = `v0:${timestamp}:${body}`
  const expected = `v0=${await hmacSha256Hex(requireSlackSigningSecret(), base)}`

  return timingSafeEqual(signature, expected)
}

async function hmacSha256Hex(secret: string, value: string) {
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

function timingSafeEqual(left: string, right: string) {
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
