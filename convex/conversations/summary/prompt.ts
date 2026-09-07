import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { type PendingSummary, type SummaryMessage } from "./data"

/** The summarizer's one user message. A console thread keeps the
 *  identifiers of what it touched, since its next run continues the work
 *  from them; a provider thread drops them as noise. */
export function conversationSummaryPrompt(input: PendingSummary) {
  return renderPromptTemplate(promptTemplates["conversations/summary"], {
    conversation: {
      console: input.surface === "console",
      messages: input.messages.map(formatMessage).join("\n\n"),
      summary: input.priorSummary,
    },
  })
}

function formatMessage(message: SummaryMessage) {
  const observedAt = message.observedAt ?? message.createdAt

  return [
    `${new Date(observedAt).toISOString()} | ${message.speaker} | ${message.actor}`,
    message.text,
  ].join("\n")
}
