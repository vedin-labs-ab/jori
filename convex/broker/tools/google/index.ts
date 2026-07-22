import { type Doc } from "../../../_generated/dataModel"
import { type AssetContext } from "../../../assets/read"
import { requireGoogleCredentials } from "../../../integrations/google/credentials"
import { callGoogleCalendarTool } from "./calendar"
import { callGmailTool } from "./gmail"

export async function callGoogleTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  const credentials = requireGoogleCredentials(integration)

  if (tool.startsWith("google_gmail_")) {
    return await callGmailTool(
      integration,
      credentials.tokens.access,
      tool,
      args,
      context
    )
  }

  if (tool.startsWith("google_calendar_")) {
    return await callGoogleCalendarTool(credentials.tokens.access, tool, args)
  }

  throw new Error(`Unknown Google tool: ${tool}`)
}
