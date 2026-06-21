import { getRuntimeSkillForIntegration } from "../skills/runtime"
import { type MessageRoutingContext } from "./context"

export function createRoutingGuidance(context: MessageRoutingContext) {
  const skill = getRuntimeSkillForIntegration(context.integration)

  if (skill?.name !== "slack") {
    return null
  }

  return [
    "Surface guidance:",
    "- If `respond` or `agent` includes `message`, format it for Slack `mrkdwn`, not GitHub Markdown.",
    "- Use `*bold*`, `_italic_`, `<https://example.com|label>`, and simple hyphen lines. Avoid `**bold**`, `[label](url)`, and pipe tables.",
  ].join("\n")
}
