import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { expireRevokedNotionAccess } from "../../integrations/notion/access"
import { callGitHubTool, createGitHubCloneCredentials } from "./github"
import { callGoogleTool } from "./google"
import { callLinearTool } from "./linear"
import { callMicrosoftTool } from "./microsoft"
import { callNotionTool } from "./notion"
import { callSlackTool } from "./slack"

export { createGitHubCloneCredentials }

export async function callProviderTool(args: {
  ctx: ActionCtx
  integration: Doc<"integrations">
  run?: Doc<"runs">
  tool: string
  toolArgs: Record<string, unknown>
}) {
  const integration = args.integration.integration
  const context =
    args.run === undefined
      ? undefined
      : {
          ctx: args.ctx,
          run: args.run,
        }

  if (integration === "slack") {
    return await callSlackTool(
      args.integration,
      args.tool,
      args.toolArgs,
      context
    )
  }

  if (integration === "linear") {
    return await callLinearTool(args.integration, args.tool, args.toolArgs)
  }

  if (integration === "github") {
    return await callGitHubTool(args.integration, args.tool, args.toolArgs)
  }

  if (integration === "gmail" || integration === "googleCalendar") {
    return await callGoogleTool(
      args.integration,
      args.tool,
      args.toolArgs,
      context
    )
  }

  if (integration === "notion") {
    try {
      return await callNotionTool(
        args.integration,
        args.tool,
        args.toolArgs,
        context
      )
    } catch (error) {
      await expireRevokedNotionAccess(args.ctx, args.integration, error)
      throw error
    }
  }

  if (integration === "microsoftEmail" || integration === "microsoftCalendar") {
    return await callMicrosoftTool(
      args.integration,
      args.tool,
      args.toolArgs,
      context
    )
  }

  throw new Error(`Unsupported integration: ${integration}`)
}
