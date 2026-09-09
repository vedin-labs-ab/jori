import { compactRecord } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"
import {
  handlePersonTextApprovalDecision,
  isPersonApprovalDecisionText,
} from "../../../approvals/runtime"
import { type Actor, createIntegrationActor } from "../../../shared/actor"
import { sha256Hex } from "../../../shared/crypto"
import { unauthorizedResponse } from "../../../shared/http"
import { privateRedirect, regionalCallback } from "../../connect/handoff"
import {
  readCallbackState,
  readOAuthCallback,
  redirectWithStatus,
} from "../../connect/http"
import {
  completeIntegrationOffer,
  failOfferAndRedirect,
} from "../../connect/install"
import { fetchGitHubInstallationProfile } from "../app"
import { githubAppInstallBaseUrl, requireGitHubAppSlug } from "../config"
import { fetchGitHubIdentity } from "../identity"
import { normalizeInstallationProfile } from "../install"
import {
  githubAuthorizationUrl,
  verifyGitHubInstallationAccess,
} from "../oauth"
import {
  createSignedGitHubState,
  parseSignedGitHubState,
  verifyGitHubRequest,
} from "../signing"
import { type getGitHubMessage } from "./events"
import { prepareGitHubEvent } from "./prepare"
import { type GitHubWebhookPayload } from "./types"

export async function handleGitHubInstall(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const githubUrl = new URL(
    `${githubAppInstallBaseUrl}/${requireGitHubAppSlug()}/installations/new`
  )
  githubUrl.searchParams.set("state", state)

  return Response.redirect(githubUrl.toString(), 302)
}

export async function handleGitHubInstallCallback(
  ctx: ActionCtx,
  request: Request
) {
  const handoff = await regionalCallback(ctx, request)
  if (handoff !== null) {
    return handoff
  }
  const requestUrl = new URL(request.url)
  const installationId = requestUrl.searchParams.get("installation_id")
  const stateValue = requestUrl.searchParams.get("state")

  if (
    installationId === null ||
    !/^\d+$/.test(installationId) ||
    stateValue === null
  ) {
    return new Response("Missing GitHub installation parameters", {
      status: 400,
    })
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: parseSignedGitHubState,
    label: "GitHub install",
  })

  if (!parsed.ok) {
    return parsed.response
  }

  const state = await createSignedGitHubState({
    ...parsed.state,
    installationId,
  })
  return privateRedirect(
    githubAuthorizationUrl(`${requestUrl.origin}/github/oauth/callback`, state)
  )
}

export async function handleGitHubOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const callback = await readOAuthCallback(ctx, request, {
    parse: parseSignedGitHubState,
    label: "GitHub authorization",
  })
  if (!callback.ok) {
    return callback.response
  }
  const { state, code, requestUrl } = callback
  const installationId = state.installationId
  if (installationId === undefined || !/^\d+$/.test(installationId)) {
    return new Response("Missing GitHub installation", { status: 400 })
  }

  let profile: Awaited<ReturnType<typeof fetchGitHubInstallationProfile>>
  let identity: Awaited<ReturnType<typeof fetchGitHubIdentity>>

  try {
    await verifyGitHubInstallationAccess({
      code,
      installationId,
      redirectUri: `${requestUrl.origin}/github/oauth/callback`,
    })
    profile = await fetchGitHubInstallationProfile(installationId)
    identity = await fetchGitHubIdentity(installationId)
    if (profile.app_slug !== identity.appSlug) {
      throw new Error("GitHub installation did not match the registered app")
    }
  } catch {
    return await failOfferAndRedirect(ctx, {
      callbackParam: "github",
      error: "GitHub installation profile could not be loaded.",
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })
  }

  const integrationId = await ctx.runMutation(
    internal.integrations.github.install.recordInstallation,
    {
      organizationId: state.organizationId,
      createdBy: state.createdBy,
      installationId,
      identity,
      profile: normalizeInstallationProfile(profile),
    }
  )

  await completeIntegrationOffer(ctx, {
    integrationOfferId: state.integrationOfferId,
    integrationId,
  })

  return redirectWithStatus(state.returnUrl, "github", "connected")
}

export async function handleGitHubEvents(ctx: ActionCtx, request: Request) {
  const body = await request.text()
  const verified = await verifyGitHubRequest(request, body)

  if (!verified) {
    return unauthorizedResponse()
  }

  let payload: GitHubWebhookPayload
  try {
    payload = JSON.parse(body) as GitHubWebhookPayload
  } catch {
    return new Response("Invalid GitHub event", { status: 400 })
  }
  const event = request.headers.get("x-github-event")
  const deliveryId = request.headers.get("x-github-delivery")
  if (event === null || deliveryId === null || payload === null) {
    return new Response("Missing GitHub delivery metadata", { status: 400 })
  }
  const prepared = prepareGitHubEvent({
    event,
    payload,
    deliveryId,
  })
  if (prepared === null) {
    return Response.json({ ok: true })
  }
  await ctx.runMutation(internal.integrations.webhooks.delivery.accept, {
    provider: "github",
    externalId: prepared.accountId,
    eventId: await sha256Hex(body),
    payload: JSON.parse(JSON.stringify(prepared)),
  })

  return Response.json({ ok: true })
}

type GitHubMessage = NonNullable<ReturnType<typeof getGitHubMessage>>
type GitHubRecordMode = "record" | "record_and_run"

export async function handleGitHubMessageEvent(
  ctx: ActionCtx,
  message: GitHubMessage,
  expectedConnectionGeneration?: number
) {
  const actor = createGitHubActor(message)

  if (
    message.actorCanDecideApprovals &&
    isPersonApprovalDecisionText({
      actorKind: message.actorKind,
      text: message.text,
    })
  ) {
    await recordGitHubMessage(ctx, message, {
      actor,
      mode: "record",
      expectedConnectionGeneration,
    })
    await handlePersonTextApprovalDecision(ctx, {
      accountId: message.accountId,
      actor,
      actorKind: message.actorKind,
      integration: "github",
      text: message.text,
      expectedConnectionGeneration,
    })
    return
  }

  await recordGitHubMessage(ctx, message, {
    actor,
    expectedConnectionGeneration,
  })
}

async function recordGitHubMessage(
  ctx: ActionCtx,
  message: GitHubMessage,
  options: {
    actor: Actor | undefined
    mode?: GitHubRecordMode
    expectedConnectionGeneration?: number
  }
) {
  await ctx.runMutation(
    internal.integrations.github.ingress.messages.record,
    compactRecord({
      accountId: message.accountId,
      mode: options.mode,
      type: message.type,
      externalId: message.externalId,
      actor: options.actor,
      conversationId: message.conversationId,
      text: message.text,
      observedAt: message.observedAt,
      data: message.data,
      expectedConnectionGeneration: options.expectedConnectionGeneration,
    })
  )
}

function createGitHubActor(message: GitHubMessage) {
  return createIntegrationActor({
    externalId: message.actorId,
    kind: message.actorKind,
    name: message.actorName,
  })
}
