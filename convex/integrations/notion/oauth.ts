import { type Doc } from "../../_generated/dataModel"
import { requireEnvironmentVariable } from "../../shared/environment"
import { optionalString } from "../../shared/input"
import {
  encodeBasicCredentials,
  expectOAuthRevocationResponse,
} from "../revoke/oauth"
import {
  notionApiVersion,
  notionOAuthRevokeUrl,
  notionOAuthTokenUrl,
} from "./config"
import { requireNotionCredentials } from "./credentials"

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
      owner?: NotionTokenOwner
      request_id?: string
    }
  | {
      error: string
      message?: string
      code?: string
      request_id?: string
    }

type NotionTokenOwner = {
  type: string
  user?: {
    id?: string
    name?: string | null
    person?: {
      email?: string | null
    }
  }
}

export function readNotionSetupIdentity(
  tokenResult: NotionTokenResponse
): { externalId: string; email?: string; name?: string } | undefined {
  if ("error" in tokenResult || tokenResult.owner?.type !== "user") {
    return undefined
  }

  const user = tokenResult.owner.user

  if (user?.id === undefined) {
    return undefined
  }

  return {
    externalId: user.id,
    email: optionalString(user.person?.email),
    name: optionalString(user.name),
  }
}

export function requireNotionClientId() {
  return requireEnvironmentVariable("NOTION_CLIENT_ID")
}

export function requireNotionClientSecret() {
  return requireEnvironmentVariable("NOTION_CLIENT_SECRET")
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

export async function revokeNotionIntegration(
  integration: Doc<"integrations">
) {
  const credentials = requireNotionCredentials(integration)
  const response = await fetch(notionOAuthRevokeUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Basic ${encodeBasicCredentials(
        requireNotionClientId(),
        requireNotionClientSecret()
      )}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body: JSON.stringify({
      token: credentials.tokens.access,
    }),
  })

  await expectOAuthRevocationResponse(response, "Notion")
}

async function notionOAuthToken(body: Record<string, string>) {
  const response = await fetch(notionOAuthTokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Basic ${encodeBasicCredentials(
        requireNotionClientId(),
        requireNotionClientSecret()
      )}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body: JSON.stringify(body),
  })

  return (await response.json()) as NotionTokenResponse
}
