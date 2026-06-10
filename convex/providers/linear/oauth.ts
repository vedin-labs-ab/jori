import { fetchFormToken, requireProviderEnv } from "../oauth"
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
  return requireProviderEnv("LINEAR_CLIENT_ID")
}

export function requireLinearClientSecret() {
  return requireProviderEnv("LINEAR_CLIENT_SECRET")
}

export async function exchangeLinearAuthorizationCode(args: {
  code: string
  redirectUri: string
}) {
  return await requestLinearToken({
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
  })
}

export async function refreshLinearAccessToken(refreshToken: string) {
  return await requestLinearToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
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

async function requestLinearToken(body: Record<string, string>) {
  return await fetchFormToken<LinearTokenResponse>(linearOAuthTokenUrl, {
    client_id: requireLinearClientId(),
    client_secret: requireLinearClientSecret(),
    ...body,
  })
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
