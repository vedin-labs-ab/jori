import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callGitHubTool, fetchGitHubTarball } from "./github"
import { callGoogleTool } from "./google"
import { callLinearTool } from "./linear"
import { callMicrosoftTool } from "./microsoft"
import { callNotionTool } from "./notion"
import { callSlackTool } from "./slack"

export { fetchGitHubTarball }

export async function callProviderTool(args: {
  ctx: ActionCtx
  execution: Doc<"executions">
  integration: Doc<"integrations">
  tool: string
  toolArgs: Record<string, unknown>
}) {
  const provider = args.integration.provider

  if (provider === "slack") {
    return await callSlackTool(args.integration, args.tool, args.toolArgs, {
      ctx: args.ctx,
      execution: args.execution,
    })
  }

  if (provider === "linear") {
    return await callLinearTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "github") {
    return await callGitHubTool(args.integration, args.tool, args.toolArgs)
  }

  if (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "googleDrive"
  ) {
    return await callGoogleTool(args.integration, args.tool, args.toolArgs, {
      ctx: args.ctx,
      execution: args.execution,
    })
  }

  if (provider === "notion") {
    return await callNotionTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "microsoftEmail" || provider === "microsoftCalendar") {
    return await callMicrosoftTool(args.integration, args.tool, args.toolArgs, {
      ctx: args.ctx,
      execution: args.execution,
    })
  }

  throw new Error(`Unsupported provider: ${provider}`)
}
