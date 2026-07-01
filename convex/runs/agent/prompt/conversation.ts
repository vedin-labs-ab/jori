import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { messageEntry } from "../../../messages/history"
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
    summary: formatConversationSummary(input),
  }
}

function formatConversationSummary(input: MessageInput) {
  return input.conversation.hasMoreMessages ? "(older messages omitted)" : null
}

function formatMessageEntry(entry: PromptMessageEntry) {
  const observed = entry.observedAt ?? entry.createdAt

  return renderPromptTemplate(promptTemplates["conversation/message"], {
    message: {
      actor: entry.actor ?? "unknown",
      actorIds: formatEntryIds(entry.actorIds),
      identifiers: formatEntryIds(entry.identifiers),
      observedAt: new Date(observed).toISOString(),
      reactions: entry.reactions,
      speaker: entry.source,
      text: entry.text,
    },
  }).trim()
}

function formatEntryIds(ids: string[]) {
  return ids.length === 0 ? null : ids.join(", ")
}
