import { messageEntry } from "../../../messages/history"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { type AgentRuntimeInput } from "../input"

type MessageInput = Extract<AgentRuntimeInput, { type: "message" }>
type PromptMessageEntry = MessageInput["conversation"]["entries"][number]

export function createMessageConversationValues(input: MessageInput) {
  const entries = input.conversation.entries.filter(
    (entry) => entry.id !== input.message._id
  )

  return {
    body:
      entries.length === 0
        ? "- None"
        : entries.map(formatMessageEntry).join("\n\n"),
    current: formatMessageEntry(messageEntry(input.message, input.integration)),
    summary: formatConversationSummary(entries.length, input),
  }
}

function formatConversationSummary(
  shownPreviousMessages: number,
  input: MessageInput
) {
  const totalPreviousMessages = Math.max(
    0,
    input.conversation.totalMessages - 1
  )

  return shownPreviousMessages < totalPreviousMessages
    ? `(showing ${shownPreviousMessages} of ${totalPreviousMessages} previous messages)`
    : null
}

function formatMessageEntry(entry: PromptMessageEntry) {
  const observed = entry.observedAt ?? entry.createdAt

  return renderPromptTemplate(promptTemplates["conversation/message"], {
    message: {
      actor: entry.actor ?? "unknown",
      actorIds: formatEntryIds(entry.actorIds),
      messageIds: formatEntryIds(entry.messageIds),
      observedAt: new Date(observed).toISOString(),
      speaker: entry.source,
      text: entry.text,
    },
  }).trim()
}

function formatEntryIds(ids: string[]) {
  return ids.length === 0 ? null : ids.join(", ")
}
