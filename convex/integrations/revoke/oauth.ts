const alreadyRevokedErrors = new Set([
  "invalid_auth",
  "invalid_grant",
  "invalid_token",
  "token_revoked",
])

type OAuthErrorResponse = {
  error?: string
  error_description?: string
  message?: string
}

export async function expectOAuthRevocationResponse(
  response: Response,
  platform: string
) {
  const result = await readOAuthResponse(response)

  if (response.ok || isAlreadyRevoked(result)) {
    return
  }

  throw new Error(
    `${platform} disconnect failed: ${
      result.error_description ??
      result.message ??
      result.error ??
      response.status
    }`
  )
}

export function isAlreadyRevoked(result: { error?: string }) {
  return result.error !== undefined && alreadyRevokedErrors.has(result.error)
}

export async function postForm(
  url: string,
  body: Record<string, string>,
  headers: Record<string, string> = {}
) {
  return await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  })
}

export function encodeBasicCredentials(clientId: string, clientSecret: string) {
  return btoa(`${clientId}:${clientSecret}`)
}

async function readOAuthResponse(response: Response) {
  const body = await response.text()

  if (body === "") {
    return {}
  }

  try {
    return JSON.parse(body) as OAuthErrorResponse
  } catch {
    return { message: body }
  }
}
