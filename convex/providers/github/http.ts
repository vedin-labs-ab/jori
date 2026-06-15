import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { createIntegrationActor } from "../../shared/actor"
import {
  ingestProviderMessage,
  readCallbackState,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
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
    return redirectWithStatus(state.returnUrl, "github", "error")
  }

  await ctx.runMutation(internal.providers.github.install.recordInstallation, {
    tenantId: state.tenantId,
    createdBy: state.createdBy,
    installationId,
    profile: normalizeInstallationProfile(profile),
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
  const message = getGitHubMessage({
    event: request.headers.get("x-github-event"),
    payload,
    deliveryId: request.headers.get("x-github-delivery"),
  })

  if (message === null) {
    return Response.json({ ok: true })
  }

  return await ingestProviderMessage(
    ctx,
    internal.messages.ingest.recordGitHubMessage,
    {
      accountId: message.accountId,
      type: message.type,
      externalId: message.externalId,
      actor: createIntegrationActor({
        integration: "github",
        externalId: message.actorId,
      }),
      conversationId: message.conversationId,
      text: message.text,
      observedAt: message.observedAt,
      data: message.data,
    }
  )
}

function normalizeInstallationProfile(profile: GitHubInstallationProfile) {
  return {
    id: profile.id,
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
