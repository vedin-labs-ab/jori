import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { normalizeEventData } from "../../events/payload"
import { unauthorizedResponse } from "../../shared/http"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../http"
import { completeIntegrationOffer, failOfferAndRedirect } from "../install"
import { notionOAuthAuthorizeUrl, notionOAuthCallbackPath } from "./config"
import { readNotionAutomationEvents } from "./events"
import {
  exchangeNotionAuthorizationCode,
  readNotionSetupIdentity,
  requireNotionClientId,
} from "./oauth"
import { enrichNotionEventData } from "./pages"
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
    return await redirectFromCallbackState(stateValue, "error")
  }

  const callback = await readOAuthCallback(request, {
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
    internal.providers.notion.install.recordOAuthInstallation,
    {
      tenantId: state.tenantId,
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
    return Response.json({ ok: true, verification_token: verificationToken })
  }

  if (!(await verifyNotionWebhookRequest(request, body))) {
    return unauthorizedResponse()
  }

  for (const event of readNotionAutomationEvents(payload)) {
    const data = normalizeEventData(
      "notion",
      await enrichNotionEventData(ctx, {
        data: event.data,
        pageId: event.pageId,
        workspaceId: event.workspaceId,
      })
    )

    if (data === undefined) {
      continue
    }

    await ctx.runMutation(internal.providers.notion.data.recordWebhookEvent, {
      workspaceId: event.workspaceId,
      key: event.key,
      type: event.type,
      match: event.match,
      actor: event.actor,
      data,
      observedAt: event.observedAt,
    })
  }

  return Response.json({ ok: true })
}

async function redirectFromCallbackState(
  stateValue: string,
  status: "connected" | "error"
) {
  try {
    const state = await parseSignedNotionState(stateValue)

    return redirectWithStatus(state.returnUrl, "notion", status)
  } catch {
    return new Response("Invalid Notion OAuth state", { status: 400 })
  }
}

function parseJsonRecord(body: string) {
  try {
    const value: unknown = JSON.parse(body)

    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function readVerificationToken(payload: Record<string, unknown>) {
  const token = payload.verification_token

  return typeof token === "string" && token !== "" ? token : undefined
}
