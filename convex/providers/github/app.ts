import {
  base64DecodeBytes,
  base64UrlEncode,
  base64UrlEncodeBytes,
} from "../../shared/encoding"
import {
  githubApiUrl,
  requireGitHubAppId,
  requireGitHubPrivateKey,
} from "./config"

export type GitHubInstallationProfile = {
  id: number
  html_url?: string
  repository_selection?: string
  permissions?: Record<string, string>
  events?: string[]
  account?: {
    id?: number
    login?: string
    type?: string
    avatar_url?: string
    html_url?: string
  }
  app_slug?: string
}

export type GitHubInstallationToken = {
  token: string
  expires_at: string
  permissions?: Record<string, string>
  repository_selection?: string
}

export async function fetchGitHubInstallationProfile(installationId: string) {
  return await githubAppRequest<GitHubInstallationProfile>(
    `/app/installations/${installationId}`,
    {
      method: "GET",
    }
  )
}

export async function createGitHubInstallationToken(
  installationId: string,
  repositoryId?: number
) {
  return await githubAppRequest<GitHubInstallationToken>(
    `/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      body:
        repositoryId === undefined
          ? undefined
          : { repository_ids: [repositoryId] },
    }
  )
}

export async function deleteGitHubInstallation(installationId: string) {
  await githubAppRequest<void>(`/app/installations/${installationId}`, {
    method: "DELETE",
    successStatuses: [202, 404],
  })
}

async function githubAppRequest<Result>(
  path: string,
  init: {
    method: "DELETE" | "GET" | "POST"
    body?: unknown
    successStatuses?: number[]
  }
) {
  const response = await fetch(`${githubApiUrl}${path}`, {
    method: init.method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${await createGitHubAppJwt()}`,
      ...(init.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      "x-github-api-version": "2022-11-28",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const result = await readGitHubResponse(response)

  if (!response.ok && !(init.successStatuses ?? []).includes(response.status)) {
    throw new Error(`GitHub App request failed: ${JSON.stringify(result)}`)
  }

  return result as Result
}

async function readGitHubResponse(response: Response) {
  const body = await response.text()

  if (body === "") {
    return null
  }

  return JSON.parse(body) as unknown
}

async function createGitHubAppJwt() {
  const header = base64UrlEncodeJson({ alg: "RS256", typ: "JWT" })
  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncodeJson({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: requireGitHubAppId(),
  })
  const input = `${header}.${payload}`
  const signature = await signRs256(input)

  return `${input}.${base64UrlEncodeBytes(signature)}`
}

function base64UrlEncodeJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value))
}

async function signRs256(input: string) {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    readPkcs8PrivateKeyBytes(requireGitHubPrivateKey()),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  return new Uint8Array(
    await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      new TextEncoder().encode(input)
    )
  )
}

function readPkcs8PrivateKeyBytes(value: string) {
  const pem = normalizePrivateKey(value)
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")
  const keyBytes = base64DecodeBytes(body)

  if (pem.includes("-----BEGIN RSA PRIVATE KEY-----")) {
    return wrapPkcs1PrivateKey(keyBytes)
  }

  return keyBytes
}

function normalizePrivateKey(value: string) {
  const decoded = decodeBase64Text(value)

  return (decoded.includes("-----BEGIN") ? decoded : value).replaceAll(
    "\\n",
    "\n"
  )
}

function decodeBase64Text(value: string) {
  try {
    return new TextDecoder().decode(base64DecodeBytes(value))
  } catch {
    return ""
  }
}

function wrapPkcs1PrivateKey(pkcs1: Uint8Array) {
  const version = new Uint8Array([0x02, 0x01, 0x00])
  const rsaAlgorithmIdentifier = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ])
  const privateKey = derSequence(0x04, pkcs1)

  return derSequence(
    0x30,
    concatBytes(version, rsaAlgorithmIdentifier, privateKey)
  )
}

function derSequence(tag: number, body: Uint8Array) {
  return concatBytes(new Uint8Array([tag]), derLength(body.length), body)
}

function derLength(length: number) {
  if (length < 128) {
    return new Uint8Array([length])
  }

  const bytes: number[] = []
  let remaining = length

  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining >>= 8
  }

  return new Uint8Array([0x80 | bytes.length, ...bytes])
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}
