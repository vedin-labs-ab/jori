import { type Doc } from "../../_generated/dataModel"
import { requireEnvironmentVariable } from "../../shared/environment"
import { fetchFormToken } from "../connect/oauth"
import {
  encodeBasicCredentials,
  expectOAuthRevocationResponse,
  postForm,
} from "../revoke/oauth"
import { linearOAuthRevokeUrl, linearOAuthTokenUrl } from "./config"
import { requireLinearCredentials } from "./credentials"
import { linearGraphql } from "./graphql"

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
  botId: string
  botName?: string
  organization: {
    id: string
    name?: string
    urlKey?: string
  }
}

export function requireLinearClientId() {
  return requireEnvironmentVariable("LINEAR_CLIENT_ID")
}

export function requireLinearClientSecret() {
  return requireEnvironmentVariable("LINEAR_CLIENT_SECRET")
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
  const result = await linearGraphql<{
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
  }>(accessToken, {
    query: `
      query JoriLinearInstallation {
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
  })

  const botId = result.data?.viewer?.id
  const organizationId = result.data?.organization?.id

  if (botId === undefined || organizationId === undefined) {
    throw new Error("Could not read Linear installation profile")
  }

  return {
    botId,
    botName: result.data?.viewer?.name,
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

export async function revokeLinearIntegration(
  integration: Doc<"integrations">
) {
  const credentials = requireLinearCredentials(integration)
  const response = await postForm(
    linearOAuthRevokeUrl,
    {
      token: credentials.tokens.refresh,
      token_type_hint: "refresh_token",
    },
    {
      authorization: `Basic ${encodeBasicCredentials(
        requireLinearClientId(),
        requireLinearClientSecret()
      )}`,
    }
  )

  await expectOAuthRevocationResponse(response, "Linear")
}

async function requestLinearToken(body: Record<string, string>) {
  return await fetchFormToken<LinearTokenResponse>(linearOAuthTokenUrl, {
    client_id: requireLinearClientId(),
    client_secret: requireLinearClientSecret(),
    ...body,
  })
}
