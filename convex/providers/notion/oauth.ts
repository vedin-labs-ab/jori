import { requireProviderEnv } from "../oauth"
import { notionApiVersion, notionOAuthTokenUrl } from "./config"

export type NotionTokenResponse =
  | {
      access_token: string
      token_type: "bearer"
      refresh_token: string | null
      bot_id: string
      workspace_icon: string | null
      workspace_name: string | null
      workspace_id: string
      duplicated_template_id: string | null
      request_id?: string
    }
  | {
      error: string
      message?: string
      code?: string
      request_id?: string
    }

export function requireNotionClientId() {
  return requireProviderEnv("NOTION_CLIENT_ID")
}

export function requireNotionClientSecret() {
  return requireProviderEnv("NOTION_CLIENT_SECRET")
}

export async function exchangeNotionAuthorizationCode(args: {
  code: string
  redirectUri: string
}) {
  return await notionOAuthToken({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
  })
}

export async function refreshNotionAccessToken(refreshToken: string) {
  return await notionOAuthToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
}

async function notionOAuthToken(body: Record<string, string>) {
  const response = await fetch(notionOAuthTokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Basic ${btoa(
        `${requireNotionClientId()}:${requireNotionClientSecret()}`
      )}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body: JSON.stringify(body),
  })

  return (await response.json()) as NotionTokenResponse
}
