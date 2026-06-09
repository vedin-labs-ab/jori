import { googleOAuthTokenUrl, googleUserInfoUrl } from "./config"

export type GoogleTokenResponse =
  | {
      access_token: string
      expires_in: number
      refresh_token?: string
      scope?: string
      token_type: string
      id_token?: string
    }
  | {
      error: string
      error_description?: string
    }

export type GoogleInstallationProfile = {
  email: string
  name?: string
  picture?: string
}

export function requireGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (clientId === undefined) {
    throw new Error("Missing GOOGLE_CLIENT_ID")
  }

  return clientId
}

export function requireGoogleClientSecret() {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (clientSecret === undefined) {
    throw new Error("Missing GOOGLE_CLIENT_SECRET")
  }

  return clientSecret
}

export async function exchangeGoogleAuthorizationCode(args: {
  code: string
  redirectUri: string
}) {
  const response = await fetch(googleOAuthTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireGoogleClientId(),
      client_secret: requireGoogleClientSecret(),
      code: args.code,
      grant_type: "authorization_code",
      redirect_uri: args.redirectUri,
    }),
  })

  return (await response.json()) as GoogleTokenResponse
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch(googleOAuthTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireGoogleClientId(),
      client_secret: requireGoogleClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  return (await response.json()) as GoogleTokenResponse
}

export async function fetchGoogleInstallationProfile(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })
  const profile = (await response.json()) as {
    email?: string
    name?: string
    picture?: string
  }

  if (!response.ok || profile.email === undefined) {
    throw new Error("Could not read Google Workspace installation profile")
  }

  return {
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  } satisfies GoogleInstallationProfile
}

export function getGoogleTokenScope(value: string | undefined) {
  return value
}
