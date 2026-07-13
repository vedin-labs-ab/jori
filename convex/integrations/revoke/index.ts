import { type Doc } from "../../_generated/dataModel"
import { revokeGitHubIntegration } from "../github/app"
import { revokeGoogleIntegration } from "../google/oauth"
import { revokeLinearIntegration } from "../linear/oauth"
import { revokeMicrosoftIntegration } from "../microsoft/oauth"
import { revokeNotionIntegration } from "../notion/oauth"
import { revokeSlackIntegration } from "../slack/oauth"

export async function revokeIntegrationAccess(
  integration: Doc<"integrations">
) {
  switch (integration.integration) {
    case "github":
      await revokeGitHubIntegration(integration)
      return
    case "gmail":
    case "googleCalendar":
      await revokeGoogleIntegration(integration)
      return
    case "linear":
      await revokeLinearIntegration(integration)
      return
    case "microsoftCalendar":
    case "microsoftEmail":
      revokeMicrosoftIntegration(integration)
      return
    case "notion":
      await revokeNotionIntegration(integration)
      return
    case "slack":
      await revokeSlackIntegration(integration)
      return
  }
}
