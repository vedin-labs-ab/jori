import { linearGraphqlUrl, linearOAuthTokenUrl } from "./config"

export type LinearTokenResponse =
  | {
      access_token: string
      token_type: string
      expires_in: number
      scope?: string | string[]
      refresh_token: string
    }
  | {
      error: string
      error_description?: string
    }

export type LinearInstallationProfile = {
  appUserId: string
  appUserName?: string
  organization: {
    id: string
    name?: string
    urlKey?: string
  }
}

export function requireLinearClientId() {
  const clientId = process.env.LINEAR_CLIENT_ID

  if (clientId === undefined) {
    throw new Error("Missing LINEAR_CLIENT_ID")
  }

  return clientId
}

export function requireLinearClientSecret() {
  const clientSecret = process.env.LINEAR_CLIENT_SECRET

  if (clientSecret === undefined) {
    throw new Error("Missing LINEAR_CLIENT_SECRET")
  }

  return clientSecret
}

export async function exchangeLinearAuthorizationCode(args: {
  code: string
  redirectUri: string
}) {
  const response = await fetch(linearOAuthTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireLinearClientId(),
      client_secret: requireLinearClientSecret(),
      code: args.code,
      grant_type: "authorization_code",
      redirect_uri: args.redirectUri,
    }),
  })

  return (await response.json()) as LinearTokenResponse
}

export async function refreshLinearAccessToken(refreshToken: string) {
  const response = await fetch(linearOAuthTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireLinearClientId(),
      client_secret: requireLinearClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  return (await response.json()) as LinearTokenResponse
}

export async function fetchLinearInstallationProfile(accessToken: string) {
  const result = (await linearGraphql(accessToken, {
    query: `
      query MiloLinearInstallation {
        viewer {
          id
          name
        }
        organization {
          id
          name
          urlKey
        }
      }
    `,
  })) as {
    data?: {
      viewer?: {
        id?: string
        name?: string
      }
      organization?: {
        id?: string
        name?: string
        urlKey?: string
      }
    }
    errors?: unknown
  }

  const appUserId = result.data?.viewer?.id
  const organizationId = result.data?.organization?.id

  if (appUserId === undefined || organizationId === undefined) {
    throw new Error("Could not read Linear installation profile")
  }

  return {
    appUserId,
    appUserName: result.data?.viewer?.name,
    organization: {
      id: organizationId,
      name: result.data?.organization?.name,
      urlKey: result.data?.organization?.urlKey,
    },
  } satisfies LinearInstallationProfile
}

export function getLinearTokenScope(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.join(" ")
  }

  return value
}

async function linearGraphql(
  accessToken: string,
  body: {
    query: string
    variables?: Record<string, unknown>
  }
) {
  const response = await fetch(linearGraphqlUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`Linear GraphQL request failed: ${JSON.stringify(result)}`)
  }

  return result
}
