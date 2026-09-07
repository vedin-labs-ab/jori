import { isRecord } from "../../../../../contracts/json"
import {
  base64DecodeBytes,
  base64UrlEncode,
  base64UrlEncodeBytes,
} from "../../../../shared/encoding"

type Credentials = { clientEmail: string; privateKey: string }
type Token = Credentials & { value: string; expiresAt: number }
const tokenEndpoint = "https://oauth2.googleapis.com/token"
let cached: Token | undefined

export async function vertexAccessToken(credentials: Credentials) {
  if (
    cached?.clientEmail === credentials.clientEmail &&
    cached.privateKey === credentials.privateKey &&
    cached.expiresAt > Date.now() + 60_000
  ) {
    return cached.value
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await assertion(credentials),
    }),
  })
  if (!response.ok) {
    throw new Error(`Vertex authentication failed (${response.status}).`)
  }
  const token: unknown = await response.json()
  if (
    !isRecord(token) ||
    typeof token.access_token !== "string" ||
    token.access_token === "" ||
    typeof token.expires_in !== "number" ||
    !Number.isFinite(token.expires_in) ||
    token.expires_in <= 0
  ) {
    throw new Error("Vertex authentication returned an invalid token.")
  }
  cached = {
    ...credentials,
    value: token.access_token,
    expiresAt: Date.now() + Math.min(token.expires_in, 3600) * 1000,
  }
  return cached.value
}

async function assertion(credentials: Credentials) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: tokenEndpoint,
      iat: now,
      exp: now + 3600,
    })
  )
  const input = `${header}.${claims}`
  const pem = credentials.privateKey.replaceAll("\\n", "\n").trim()
  if (!pem.startsWith("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("VERTEX_PRIVATE_KEY must be a PKCS8 PEM private key.")
  }
  const key = await crypto.subtle.importKey(
    "pkcs8",
    base64DecodeBytes(pem.replace(/-----[^-]+-----|\s/g, "")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(input)
  )
  return `${input}.${base64UrlEncodeBytes(new Uint8Array(signature))}`
}
