import { fetchFormToken, requireProviderEnv } from "../oauth"
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
  id: string
  email: string
  name?: string
  picture?: string
}

export function requireGoogleClientId() {
  return requireProviderEnv("GOOGLE_CLIENT_ID")
}

export function requireGoogleClientSecret() {
  return requireProviderEnv("GOOGLE_CLIENT_SECRET")
}

export async function exchangeGoogleAuthorizationCode(args: {
  code: string
  redirectUri: string
}) {
  return await requestGoogleToken({
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
  })
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  return await requestGoogleToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
}

export async function fetchGoogleInstallationProfile(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })
  const profile = (await response.json()) as {
    sub?: string
    email?: string
    name?: string
    picture?: string
  }

  if (
    !response.ok ||
    profile.sub === undefined ||
    profile.email === undefined
  ) {
    throw new Error("Could not read Google Workspace installation profile")
  }

  return {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  } satisfies GoogleInstallationProfile
}

async function requestGoogleToken(body: Record<string, string>) {
  return await fetchFormToken<GoogleTokenResponse>(googleOAuthTokenUrl, {
    client_id: requireGoogleClientId(),
    client_secret: requireGoogleClientSecret(),
    ...body,
  })
}
