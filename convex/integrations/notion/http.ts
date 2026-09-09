import { isRecord } from "../../../contracts/json"
import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { unauthorizedResponse } from "../../shared/http"
import { readString } from "../../shared/input"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../connect/http"
import {
  completeIntegrationOffer,
  failOfferAndRedirect,
} from "../connect/install"
import { notionOAuthAuthorizeUrl, notionOAuthCallbackPath } from "./config"
import {
  exchangeNotionAuthorizationCode,
  readNotionSetupIdentity,
  requireNotionClientId,
} from "./oauth"
import { parseSignedNotionState, verifyNotionWebhookRequest } from "./signing"

export async function handleNotionInstall(request: Request) {
  return oauthAuthorizeRedirect(request, {
    authorizeUrl: notionOAuthAuthorizeUrl,
    callbackPath: notionOAuthCallbackPath,
    clientId: requireNotionClientId(),
    params: {
      response_type: "code",
      owner: "user",
    },
  })
}

export async function handleNotionOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const requestUrl = new URL(request.url)
  const stateValue = requestUrl.searchParams.get("state")

  if (requestUrl.searchParams.get("error") !== null && stateValue !== null) {
    return await redirectToCallbackError(stateValue)
  }

  const callback = await readOAuthCallback(ctx, request, {
    parse: parseSignedNotionState,
    label: "Notion OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, state } = callback
  const tokenResult = await exchangeNotionAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${notionOAuthCallbackPath}`,
  })

  if ("error" in tokenResult) {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "notion",
      error: "Notion OAuth token exchange failed.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  const integrationId = await ctx.runMutation(
    internal.integrations.notion.install.recordOAuthInstallation,
    {
      organizationId: state.organizationId,
      createdBy: state.createdBy,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token ?? undefined,
      profile: {
        botId: tokenResult.bot_id,
        workspaceId: tokenResult.workspace_id,
        workspaceName: tokenResult.workspace_name ?? undefined,
        workspaceIcon: tokenResult.workspace_icon ?? undefined,
        duplicatedTemplateId: tokenResult.duplicated_template_id ?? undefined,
      },
      setupIdentity: readNotionSetupIdentity(tokenResult),
    }
  )

  if (integrationId === null) {
    if (state.integrationOfferId !== undefined) {
      await ctx.runMutation(internal.integrations.offers.updates.complete, {
        integrationOfferId: state.integrationOfferId,
        error:
          "An active Notion connection already uses a different authorization. Its existing access has been kept.",
      })
    }
    return new Response(
      "This Notion workspace already has an active connection using a different authorization. The existing connection has been kept. Return to Jori and ask the person who connected it to manage its access.",
      { status: 409 }
    )
  }

  await completeIntegrationOffer(ctx, {
    integrationOfferId: state.integrationOfferId,
    integrationId,
  })

  return redirectWithStatus(state.returnUrl, "notion", "connected")
}

export async function handleNotionEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const payload = parseJsonRecord(body)

  if (payload === null) {
    return new Response("Invalid Notion event payload", { status: 400 })
  }

  const verificationToken = readVerificationToken(payload)

  if (verificationToken !== undefined) {
    await ctx.runMutation(internal.integrations.notion.setup.index.capture, {
      token: verificationToken,
    })
    return Response.json({ ok: true })
  }

  if (!(await verifyNotionWebhookRequest(request, body))) {
    return unauthorizedResponse()
  }

  const workspaceId = readString(payload, "workspace_id")
  const eventId = readString(payload, "id")
  if (workspaceId === undefined || eventId === undefined) {
    return new Response("Invalid Notion event payload", { status: 400 })
  }
  await ctx.runMutation(internal.integrations.webhooks.delivery.accept, {
    provider: "notion",
    externalId: workspaceId,
    eventId,
    payload,
  })

  return Response.json({ ok: true })
}

async function redirectToCallbackError(stateValue: string) {
  try {
    const state = await parseSignedNotionState(stateValue)

    return redirectWithStatus(state.returnUrl, "notion", "error")
  } catch {
    return new Response("Invalid Notion OAuth state", { status: 400 })
  }
}

function parseJsonRecord(body: string) {
  try {
    const value: unknown = JSON.parse(body)

    return isRecord(value) ? value : null
  } catch {
    return null
  }
}

function readVerificationToken(payload: Record<string, unknown>) {
  const token = payload.verification_token

  return typeof token === "string" && token !== "" ? token : undefined
}
