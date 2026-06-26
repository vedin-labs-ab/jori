import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { linearIssueCommentEvent } from "../../automations/names"
import { createIntegrationActor } from "../../shared/actor"
import {
  readCallbackState,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
import { completeIntegrationOffer, failIntegrationOffer } from "../install"
import {
  handleLinearApprovalDecision,
  isLinearApprovalDecision,
} from "./approvals"
import {
  linearOAuthAuthorizeUrl,
  linearOAuthCallbackPath,
  linearOAuthScopes,
} from "./config"
import {
  getLinearMessage,
  getLinearReaction,
  type LinearWebhookPayload,
} from "./events"
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
    await failIntegrationOffer(ctx, {
      integrationOfferId: state.integrationOfferId,
      error: "Linear OAuth token exchange failed.",
    })

    return redirectWithStatus(state.returnUrl, "linear", "error")
  }

  let profile: Awaited<ReturnType<typeof fetchLinearInstallationProfile>>

  try {
    profile = await fetchLinearInstallationProfile(tokenResult.access_token)
  } catch {
    await failIntegrationOffer(ctx, {
      integrationOfferId: state.integrationOfferId,
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

  await completeIntegrationOffer(ctx, {
    integrationOfferId: state.integrationOfferId,
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

  if (message !== null) {
    const hydratedMessage = await hydrateLinearMessage(ctx, message)

    if (isLinearApprovalDecision(hydratedMessage)) {
      await recordLinearMessage(ctx, hydratedMessage, "record")
      await handleLinearApprovalDecision(ctx, hydratedMessage)
      return Response.json({ ok: true })
    }

    await recordLinearMessage(ctx, hydratedMessage)

    return Response.json({ ok: true })
  }

  const reaction = getLinearReaction({ payload })

  if (reaction !== null) {
    await recordLinearReaction(ctx, reaction)
  }

  return Response.json({ ok: true })
}

type LinearMessage = NonNullable<ReturnType<typeof getLinearMessage>>
type LinearReaction = NonNullable<ReturnType<typeof getLinearReaction>>
type LinearRecordMode = "record" | "record_and_run"

async function recordLinearMessage(
  ctx: ActionCtx,
  message: LinearMessage,
  mode?: LinearRecordMode
) {
  await ctx.runMutation(internal.messages.intake.record, {
    accountId: message.accountId,
    integration: "linear",
    ...(mode === undefined ? {} : { mode }),
    type: message.type,
    externalId: message.externalId,
    actor: createIntegrationActor({
      externalId: message.actorId,
      kind: message.actorKind,
      email: message.actorEmail,
      name: message.actorName,
    }),
    conversationId: message.conversationId,
    text: message.text,
    observedAt: message.observedAt,
    data: message.data,
  })
}

async function recordLinearReaction(ctx: ActionCtx, reaction: LinearReaction) {
  await ctx.runMutation(internal.reactions.intake.record, {
    accountId: reaction.accountId,
    integration: "linear",
    action: reaction.action,
    reaction: reaction.reaction,
    actor: createIntegrationActor({
      externalId: reaction.actorId,
      kind: "user",
      email: reaction.actorEmail,
      name: reaction.actorName,
    }),
    target: {
      key: reaction.target.key,
      identifiers: reaction.target.identifiers,
      actor: createIntegrationActor({
        externalId: reaction.target.actorId,
        kind: "user",
      }),
      conversationId: reaction.target.conversationId,
      text: reaction.target.text,
    },
    observedAt: reaction.observedAt,
  })
}

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
