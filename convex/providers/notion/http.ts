import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { redirectWithStatus } from "../http"
import { notionOAuthAuthorizeUrl, notionOAuthCallbackPath } from "./config"
import { exchangeNotionAuthorizationCode, requireNotionClientId } from "./oauth"
import { parseSignedNotionState } from "./signing"

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

  let state: Awaited<ReturnType<typeof parseSignedNotionState>>

  try {
    state = await parseSignedNotionState(stateValue)
  } catch {
    return new Response("Invalid Notion OAuth state", { status: 400 })
  }

  if (Date.now() - state.createdAt > 10 * 60 * 1000) {
    return new Response("Expired Notion OAuth state", { status: 400 })
  }

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
