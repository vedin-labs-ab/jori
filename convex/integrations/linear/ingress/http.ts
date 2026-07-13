import { linearIssueCommentEvent } from "../../../../contracts/automations/events/names"
import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"
import { createIntegrationActor } from "../../../shared/actor"
import { unauthorizedResponse } from "../../../shared/http"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
} from "../../connect/http"
import {
  completeIntegrationOffer,
  failOfferAndRedirect,
} from "../../connect/install"
import {
  linearOAuthAuthorizeUrl,
  linearOAuthCallbackPath,
  linearOAuthScopes,
} from "../config"
import {
  exchangeLinearAuthorizationCode,
  fetchLinearInstallationProfile,
  getLinearTokenScope,
  requireLinearClientId,
} from "../oauth"
import { parseSignedLinearState, verifyLinearRequest } from "../signing"
import {
  handleLinearApprovalDecision,
  isLinearApprovalDecision,
} from "./approvals"
import {
  getLinearMessage,
  getLinearReaction,
  type LinearWebhookPayload,
} from "./events"
import { fetchLinearIssueContext, type LinearIssueContext } from "./issues"
import { recordLinearLifecycleEvent } from "./lifecycle"

export async function handleLinearInstall(request: Request) {
  return oauthAuthorizeRedirect(request, {
    authorizeUrl: linearOAuthAuthorizeUrl,
    callbackPath: linearOAuthCallbackPath,
    clientId: requireLinearClientId(),
    params: {
      response_type: "code",
      scope: linearOAuthScopes.join(","),
      actor: "app",
    },
  })
}

export async function handleLinearOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const callback = await readOAuthCallback(request, {
    parse: parseSignedLinearState,
    label: "Linear OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback
  const tokenResult = await exchangeLinearAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${linearOAuthCallbackPath}`,
  })

  if ("error" in tokenResult) {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "linear",
      error: "Linear OAuth token exchange failed.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  let profile: Awaited<ReturnType<typeof fetchLinearInstallationProfile>>

  try {
    profile = await fetchLinearInstallationProfile(tokenResult.access_token)
  } catch {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "linear",
      error: "Linear installation profile could not be loaded.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  const integrationId = await ctx.runMutation(
    internal.integrations.linear.install.recordOAuthInstallation,
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

    return Response.json({ ok: true })
  }

  await recordLinearLifecycleEvent(ctx, {
    payload,
    deliveryId: request.headers.get("linear-delivery"),
  })

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
      kind: "person",
      email: reaction.actorEmail,
      name: reaction.actorName,
    }),
    target: {
      key: reaction.target.key,
      identifiers: reaction.target.identifiers,
      actor: createIntegrationActor({
        externalId: reaction.target.actorId,
        kind: "person",
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
    internal.integrations.linear.ingress.hydration.issueProject,
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
