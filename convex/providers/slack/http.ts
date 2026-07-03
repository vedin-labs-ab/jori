import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { isPersonApprovalDecisionText } from "../../approvals/runtime"
import {
  handleSlackApprovalDecision,
  handleSlackApprovalInteraction,
} from "../../approvals/slack"
import { handleSlackIntegrationOfferInteraction } from "../../integrations/offers/interaction"
import { createIntegrationActor } from "../../shared/actor"
import {
  oauthAuthorizeRedirect,
  readOAuthCallback,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
import { completeIntegrationOffer, failOfferAndRedirect } from "../install"
import {
  slackBotScopes,
  slackInstallUserScopes,
  slackOAuthAuthorizeUrl,
  slackOAuthCallbackPath,
} from "./config"
import { enrichSlackMessageData } from "./directory/channels"
import { getSlackActorProfile } from "./directory/users"
import { getSlackMessage, type SlackEventPayload } from "./events"
import { exchangeSlackAuthorizationCode, requireSlackClientId } from "./oauth"
import { parseSignedSlackState, verifySlackRequest } from "./signing"

export async function handleSlackInstall(request: Request) {
  return oauthAuthorizeRedirect(request, {
    authorizeUrl: slackOAuthAuthorizeUrl,
    callbackPath: slackOAuthCallbackPath,
    clientId: requireSlackClientId(),
    params: {
      scope: slackBotScopes.join(","),
      user_scope: slackInstallUserScopes.join(","),
    },
  })
}

export async function handleSlackOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const callback = await readOAuthCallback(request, {
    parse: parseSignedSlackState,
    label: "Slack OAuth",
  })

  if (!callback.ok) {
    return callback.response
  }

  const { code, requestUrl, state } = callback
  const tokenResult = await exchangeSlackAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${slackOAuthCallbackPath}`,
  })

  const botToken =
    tokenResult.ok === true && tokenResult.access_token !== ""
      ? tokenResult.access_token
      : undefined
  const userToken =
    tokenResult.ok === true && tokenResult.authed_user?.access_token !== ""
      ? tokenResult.authed_user?.access_token
      : undefined

  if (
    tokenResult.ok !== true ||
    botToken === undefined ||
    userToken === undefined
  ) {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "slack",
      error: "Slack OAuth did not return required bot and user tokens.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  const integrationId = await ctx.runMutation(
    internal.providers.slack.install.recordOAuthInstallation,
    {
      tenantId: state.tenantId,
      createdBy: state.createdBy,
      accountId: tokenResult.team.id,
      botScopes: tokenResult.scope,
      botToken,
      team: tokenResult.team,
      botUserId: tokenResult.bot_user_id,
      userScopes: tokenResult.authed_user?.scope,
      userToken,
      setupIdentity: slackSetupIdentity(tokenResult.authed_user?.id),
    }
  )

  await completeIntegrationOffer(ctx, {
    integrationOfferId: state.integrationOfferId,
    integrationId,
  })

  return redirectWithStatus(state.returnUrl, "slack", "connected")
}

function slackSetupIdentity(externalId: string | undefined) {
  return externalId === undefined ? undefined : { externalId }
}

export async function handleSlackEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const verified = await verifySlackRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = JSON.parse(body) as SlackEventPayload

  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge ?? "" })
  }

  if (payload.type !== "event_callback") {
    return Response.json({ ok: true })
  }

  const message = getSlackMessage(payload)

  if (message !== null) {
    return await handleSlackMessageEvent(ctx, message)
  }

  return Response.json({ ok: true })
}

async function handleSlackMessageEvent(ctx: ActionCtx, message: SlackMessage) {
  if (
    isPersonApprovalDecisionText({
      actorKind: message.actorKind,
      text: message.text,
    })
  ) {
    const actorProfile = await getSlackActorProfile(ctx, {
      accountId: message.accountId,
      actorId: message.actorId,
    })

    if (
      await handleSlackApprovalDecision(ctx, {
        accountId: message.accountId,
        actorId: message.actorId,
        actorEmail: actorProfile?.email,
        actorName: actorProfile?.name,
        text: message.text,
        data: message.data,
      })
    ) {
      return Response.json({ ok: true })
    }
  }

  const [actorProfile, data] = await Promise.all([
    message.actorKind === "person"
      ? getSlackActorProfile(ctx, {
          accountId: message.accountId,
          actorId: message.actorId,
        })
      : undefined,
    enrichSlackMessageData(ctx, {
      accountId: message.accountId,
      data: message.data,
    }),
  ])

  await ctx.runMutation(internal.messages.intake.record, {
    accountId: message.accountId,
    integration: "slack",
    type: message.type,
    externalId: message.externalId,
    mentioned: message.mentioned,
    actor: createIntegrationActor({
      externalId: message.actorId,
      aliases: message.actorAliases,
      kind: message.actorKind,
      email: actorProfile?.email,
      name: actorProfile?.name,
    }),
    conversationId: message.conversationId,
    text: message.text,
    observedAt: message.observedAt,
    data,
  })

  return Response.json({ ok: true })
}

type SlackMessage = NonNullable<ReturnType<typeof getSlackMessage>>

export async function handleSlackInteractions(
  ctx: ActionCtx,
  request: Request
) {
  const body = await request.text()
  const verified = await verifySlackRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  const payload = new URLSearchParams(body).get("payload")

  if (payload === null) {
    return new Response("Missing Slack interaction payload", { status: 400 })
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(payload) as unknown
  } catch {
    return new Response("Invalid Slack interaction payload", { status: 400 })
  }

  if (await handleSlackIntegrationOfferInteraction(ctx, parsed)) {
    return Response.json({ ok: true })
  }

  return await handleSlackApprovalInteraction(ctx, parsed)
}
