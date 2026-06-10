import { type Doc } from "../_generated/dataModel"
import { callGitHubTool, fetchGitHubTarball } from "./providers/github"
import { callGoogleTool } from "./providers/google"
import { callLinearTool } from "./providers/linear"
import { callMicrosoftTool } from "./providers/microsoft"
import { callNotionTool } from "./providers/notion"
import { callSlackTool } from "./providers/slack"

export { fetchGitHubTarball }

export async function callProviderTool(args: {
  integration: Doc<"integrations">
  tool: string
  toolArgs: Record<string, unknown>
}) {
  const provider = args.integration.provider

  if (provider === "slack") {
    return await callSlackTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "linear") {
    return await callLinearTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "github") {
    return await callGitHubTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "gmail" || provider === "googleCalendar") {
    return await callGoogleTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "notion") {
    return await callNotionTool(args.integration, args.tool, args.toolArgs)
  }

  if (provider === "microsoftEmail" || provider === "microsoftCalendar") {
    return await callMicrosoftTool(args.integration, args.tool, args.toolArgs)
  }

  throw new Error(`Unsupported provider: ${provider}`)
}
