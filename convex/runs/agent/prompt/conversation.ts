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
  // The history's own entry for the current message carries what only a
  // read of the database could add: the line for a console context.
  const context = input.conversation.entries.find(
    (entry) => entry.id === input.message._id
  )?.context

  return {
    body:
      entries.length === 0
        ? null
        : entries.map(formatMessageEntry).join("\n\n"),
    current: formatMessageEntry(
      messageEntry(input.message, undefined, context ?? undefined)
    ),
    omitted: input.conversation.hasMoreMessages,
    // The summary stands in for what the recent window left out, so a
    // window that holds the whole conversation has nothing for it to say.
    summary: input.conversation.hasMoreMessages
      ? input.conversation.summary
      : null,
  }
}

function formatMessageEntry(entry: PromptMessageEntry) {
  const observed = entry.observedAt ?? entry.createdAt

  return renderPromptTemplate(promptTemplates["agent/session/message"], {
    message: {
      actor: entry.actor ?? "unknown",
      actorIds: formatEntryIds(entry.actorIds),
      context: entry.context,
      identifiers: formatEntryIds(entry.identifiers),
      observedAt: new Date(observed).toISOString(),
      reactions: entry.reactions,
      speaker: entry.source,
      text: entry.text,
    },
  })
}

function formatEntryIds(ids: string[]) {
  return ids.length === 0 ? null : ids.join(", ")
}
