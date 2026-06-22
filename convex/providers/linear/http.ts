import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { linearIssueCommentEvent } from "../../automations/names"
import { createIntegrationActor } from "../../shared/actor"
import {
  readCallbackState,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
import { completeSetupLink, failSetupLink } from "../install"
import {
  linearOAuthAuthorizeUrl,
  linearOAuthCallbackPath,
  linearOAuthScopes,
} from "./config"
import { getLinearMessage, type LinearWebhookPayload } from "./events"
import { fetchLinearIssueContext, type LinearIssueContext } from "./issues"
import {
  exchangeLinearAuthorizationCode,
  fetchLinearInstallationProfile,
  getLinearTokenScope,
  requireLinearClientId,
} from "./oauth"
import { parseSignedLinearState, verifyLinearRequest } from "./signing"

export async function handleLinearInstall(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const linearUrl = new URL(linearOAuthAuthorizeUrl)
  linearUrl.searchParams.set("client_id", requireLinearClientId())
  linearUrl.searchParams.set("response_type", "code")
  linearUrl.searchParams.set("scope", linearOAuthScopes.join(","))
  linearUrl.searchParams.set("state", state)
  linearUrl.searchParams.set("actor", "app")
  linearUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${linearOAuthCallbackPath}`
  )

  return Response.redirect(linearUrl.toString(), 302)
}

export async function handleLinearOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: parseSignedLinearState,
    label: "Linear OAuth",
  })

  if (!parsed.ok) {
    return parsed.response
  }

  const state = parsed.state
  const tokenResult = await exchangeLinearAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${linearOAuthCallbackPath}`,
  })

  if ("error" in tokenResult) {
    await failSetupLink(ctx, {
      setupLinkId: state.setupLinkId,
      error: "Linear OAuth token exchange failed.",
    })

    return redirectWithStatus(state.returnUrl, "linear", "error")
  }

  let profile: Awaited<ReturnType<typeof fetchLinearInstallationProfile>>

  try {
    profile = await fetchLinearInstallationProfile(tokenResult.access_token)
  } catch {
    await failSetupLink(ctx, {
      setupLinkId: state.setupLinkId,
      error: "Linear installation profile could not be loaded.",
    })

    return redirectWithStatus(state.returnUrl, "linear", "error")
  }

  const integrationId = await ctx.runMutation(
    internal.providers.linear.install.recordOAuthInstallation,
    {
      tenantId: state.tenantId,
      createdBy: state.createdBy,
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      scope: getLinearTokenScope(tokenResult.scope),
      profile,
    }
  )

  await completeSetupLink(ctx, {
    setupLinkId: state.setupLinkId,
    integrationId,
  })

  return redirectWithStatus(state.returnUrl, "linear", "connected")
}

export async function handleLinearEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const verified = await verifyLinearRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = JSON.parse(body) as LinearWebhookPayload
  const message = getLinearMessage({
    payload,
    deliveryId: request.headers.get("linear-delivery"),
  })

  if (message === null) {
    return Response.json({ ok: true })
  }

  const hydratedMessage = await hydrateLinearMessage(ctx, message)

  await ctx.runMutation(internal.messages.intake.record, {
    accountId: hydratedMessage.accountId,
    integration: "linear",
    type: hydratedMessage.type,
    externalId: hydratedMessage.externalId,
    actor: createIntegrationActor({
      externalId: hydratedMessage.actorId,
      kind: hydratedMessage.actorKind,
      email: hydratedMessage.actorEmail,
      name: hydratedMessage.actorName,
    }),
    conversationId: hydratedMessage.conversationId,
    text: hydratedMessage.text,
    observedAt: hydratedMessage.observedAt,
    data: hydratedMessage.data,
  })

  return Response.json({ ok: true })
}

type LinearMessage = NonNullable<ReturnType<typeof getLinearMessage>>

async function hydrateLinearMessage(
  ctx: ActionCtx,
  message: LinearMessage
): Promise<LinearMessage> {
  const event = linearIssueCommentEvent(message.data.action)

  if (event === undefined) {
    return message
  }

  if (message.data.projectId !== undefined) {
    return message
  }

  const plan = await ctx.runQuery(
    internal.providers.linear.hydration.issueProject,
    {
      accountId: message.accountId,
      event,
      match: linearIssueMatch(message),
    }
  )

  if (plan.status !== "ready" || !plan.required) {
    return message
  }

  return withLinearIssueContext(
    message,
    await fetchLinearIssueContext(plan.integration, message.data.issueId)
  )
}

function linearIssueMatch(message: LinearMessage) {
  return {
    issue: message.data.issueId,
    ...(message.data.teamId === undefined ? {} : { team: message.data.teamId }),
  }
}

function withLinearIssueContext(
  message: LinearMessage,
  issue: LinearIssueContext | null
): LinearMessage {
  if (issue === null) {
    return message
  }

  return {
    ...message,
    data: {
      ...message.data,
      teamId: message.data.teamId ?? issue.teamId,
      projectId: message.data.projectId ?? issue.projectId,
    },
  }
}
