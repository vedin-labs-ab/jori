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
  execution?: Doc<"executions">
  integration: Doc<"integrations">
  tool: string
  toolArgs: Record<string, unknown>
}) {
  const integration = args.integration.integration
  const context =
    args.execution === undefined
      ? undefined
      : {
          ctx: args.ctx,
          execution: args.execution,
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

  if (
    integration === "gmail" ||
    integration === "googleCalendar" ||
    integration === "googleDrive"
  ) {
    return await callGoogleTool(
      args.integration,
      args.tool,
      args.toolArgs,
      context
    )
  }

  if (integration === "notion") {
    return await callNotionTool(args.integration, args.tool, args.toolArgs)
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
