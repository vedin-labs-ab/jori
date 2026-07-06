import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  handlePersonTextApprovalDecision,
  isPersonApprovalDecisionText,
} from "../../approvals/runtime"
import { type Actor, createIntegrationActor } from "../../shared/actor"
import {
  readCallbackState,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
import { completeIntegrationOffer, failIntegrationOffer } from "../install"
import { recordGitHubLifecycleEvent } from "../lifecycle/github"
import {
  fetchGitHubInstallationProfile,
  type GitHubInstallationProfile,
} from "./app"
import { githubAppInstallBaseUrl, requireGitHubAppSlug } from "./config"
import { getGitHubMessage } from "./events"
import { parseSignedGitHubState, verifyGitHubRequest } from "./signing"
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
  const requestUrl = new URL(request.url)
  const installationId = requestUrl.searchParams.get("installation_id")
  const stateValue = requestUrl.searchParams.get("state")

  if (installationId === null || stateValue === null) {
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

  const state = parsed.state

  let profile: Awaited<ReturnType<typeof fetchGitHubInstallationProfile>>

  try {
    profile = await fetchGitHubInstallationProfile(installationId)
  } catch {
    await failIntegrationOffer(ctx, {
      integrationOfferId: state.integrationOfferId,
      error: "GitHub installation profile could not be loaded.",
    })

    return redirectWithStatus(state.returnUrl, "github", "error")
  }

  const integrationId = await ctx.runMutation(
    internal.providers.github.install.recordInstallation,
    {
      tenantId: state.tenantId,
      createdBy: state.createdBy,
      installationId,
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

  const payload = JSON.parse(body) as GitHubWebhookPayload
  const webhook = {
    event: request.headers.get("x-github-event"),
    payload,
    deliveryId: request.headers.get("x-github-delivery"),
  }
  const message = getGitHubMessage(webhook)

  if (message === null) {
    await recordGitHubLifecycleEvent(ctx, webhook)

    return Response.json({ ok: true })
  }

  await handleGitHubMessageEvent(ctx, message)

  return Response.json({ ok: true })
}

type GitHubMessage = NonNullable<ReturnType<typeof getGitHubMessage>>
type GitHubRecordMode = "record" | "record_and_run"

export async function handleGitHubMessageEvent(
  ctx: ActionCtx,
  message: GitHubMessage
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
    })
    await handlePersonTextApprovalDecision(ctx, {
      accountId: message.accountId,
      actor,
      actorKind: message.actorKind,
      integration: "github",
      text: message.text,
    })
    return
  }

  await recordGitHubMessage(ctx, message, { actor })
}

async function recordGitHubMessage(
  ctx: ActionCtx,
  message: GitHubMessage,
  options: {
    actor: Actor | undefined
    mode?: GitHubRecordMode
  }
) {
  await ctx.runMutation(internal.messages.intake.record, {
    accountId: message.accountId,
    integration: "github",
    ...(options.mode === undefined ? {} : { mode: options.mode }),
    type: message.type,
    externalId: message.externalId,
    actor: options.actor,
    conversationId: message.conversationId,
    text: message.text,
    observedAt: message.observedAt,
    data: message.data,
  })
}

function createGitHubActor(message: GitHubMessage) {
  return createIntegrationActor({
    externalId: message.actorId,
    kind: message.actorKind,
    name: message.actorName,
  })
}

function normalizeInstallationProfile(profile: GitHubInstallationProfile) {
  return {
    id: profile.id,
    app_slug: profile.app_slug,
    html_url: profile.html_url,
    account:
      profile.account === undefined
        ? undefined
        : {
            login: profile.account.login,
            avatar_url: profile.account.avatar_url,
            html_url: profile.account.html_url,
          },
  }
}
