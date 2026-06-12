import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import {
  readCallbackState,
  redirectWithStatus,
  unauthorizedResponse,
} from "../http"
import { notionOAuthAuthorizeUrl, notionOAuthCallbackPath } from "./config"
import { readNotionAutomationEvents } from "./events"
import { exchangeNotionAuthorizationCode, requireNotionClientId } from "./oauth"
import { parseSignedNotionState, verifyNotionWebhookRequest } from "./signing"

export async function handleNotionInstall(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")

  if (state === null) {
    return new Response("Missing state", { status: 400 })
  }

  const notionUrl = new URL(notionOAuthAuthorizeUrl)
  notionUrl.searchParams.set("client_id", requireNotionClientId())
  notionUrl.searchParams.set("response_type", "code")
  notionUrl.searchParams.set("owner", "user")
  notionUrl.searchParams.set("state", state)
  notionUrl.searchParams.set(
    "redirect_uri",
    `${requestUrl.origin}${notionOAuthCallbackPath}`
  )

  return Response.redirect(notionUrl.toString(), 302)
}

export async function handleNotionOAuthCallback(
  ctx: ActionCtx,
  request: Request
) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const stateValue = requestUrl.searchParams.get("state")
  const error = requestUrl.searchParams.get("error")

  if (error !== null && stateValue !== null) {
    return await redirectFromCallbackState(stateValue, "error")
  }

  if (code === null || stateValue === null) {
    return new Response("Missing OAuth callback parameters", { status: 400 })
  }

  const parsed = await readCallbackState({
    value: stateValue,
    parse: parseSignedNotionState,
    label: "Notion OAuth",
  })

  if (!parsed.ok) {
    return parsed.response
  }

  const state = parsed.state
  const tokenResult = await exchangeNotionAuthorizationCode({
    code,
    redirectUri: `${requestUrl.origin}${notionOAuthCallbackPath}`,
  })

  if ("error" in tokenResult) {
    return redirectWithStatus(state.returnUrl, "notion", "error")
  }

  await ctx.runMutation(
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
    }
  )

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
    await ctx.runMutation(internal.providers.notion.data.recordWebhookEvent, {
      workspaceId: event.workspaceId,
      key: event.key,
      type: event.type,
      resource: event.resource,
      criteria: event.criteria,
      actor: event.actor,
      data: event.data,
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
