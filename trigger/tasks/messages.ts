import { promptTemplates } from "../../convex/prompts/generated"
import { renderPromptTemplate } from "../../convex/prompts/render"
import { type RuntimeMessage } from "../types"

export function formatSessionMessage(message: RuntimeMessage) {
  const observed = message.observedAt ?? message.createdAt

  return renderPromptTemplate(promptTemplates["conversation/message"], {
    message: {
      actor: message.actor ?? "unknown",
      identifiers: message.identifiers.join(", "),
      observedAt: new Date(observed).toISOString(),
      speaker: message.source,
      text: message.text,
    },
  }).trim()
}
