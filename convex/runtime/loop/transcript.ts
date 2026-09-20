import { type RuntimePrompt } from "../../../contracts/runtime/prompt"
import { collapseWhitespace } from "../../../contracts/text"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { type RuntimeMessage } from "../../integrations/messages/runtime"
import { type RuntimeInteraction } from "../../reactions/cursor"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { type DrainedSessionBatch } from "../../sessions/drain"
import { type AgentRuntime } from "../platform/types"

// The prompt prefix every turn starts with: instructions as the system
// message, then the organization, requester, place, and person contexts
// (when present) and the run context as user messages, broad to narrow.
// It is rebuilt each turn and never stored; the transcript holds only history.
export function promptMessages(prompt: RuntimePrompt): TranscriptMessage[] {
  const contexts = [
    prompt.organization,
    prompt.requester,
    prompt.place,
    prompt.person,
  ].filter((content): content is string => content !== null)

  return [
    { content: prompt.instructions, role: "system" },
    ...contexts.map((content) => ({ content, role: "user" as const })),
    { content: prompt.context, role: "user" },
  ]
}

export function formatSessionMessage(message: RuntimeMessage) {
  const observed = message.observedAt ?? message.createdAt

  return renderPromptTemplate(promptTemplates["agent/session/message"], {
    message: {
      actor: message.actor ?? "unknown",
      actorIds: message.actorIds.join(", "),
      context: message.context ?? null,
      identifiers: message.identifiers.join(", "),
      observedAt: new Date(observed).toISOString(),
      reactions: message.reactions,
      speaker: message.source,
      text: message.text,
    },
  })
}

export function formatSessionInteraction(interaction: RuntimeInteraction) {
  const observed = interaction.observedAt ?? interaction.createdAt

  return renderPromptTemplate(promptTemplates["agent/session/reaction"], {
    reaction: {
      actor: interaction.actor ?? "unknown",
      actorIds: interaction.actorIds.join(", "),
      identifiers: interaction.identifiers.join(", "),
      observedAt: new Date(observed).toISOString(),
      preview: interactionPreview(interaction),
      reaction: interaction.reaction,
      speaker: interaction.source,
      type: interaction.type,
    },
  })
}

/** One drained batch as transcript rows. Person context precedes the batch
 *  so a new speaker's bundle lands before their first message. */
export function drainedBatchMessages(
  batch: DrainedSessionBatch
): TranscriptMessage[] {
  return [
    ...(batch.contexts ?? []),
    ...sessionItems(batch).map((item) =>
      item.type === "message"
        ? formatSessionMessage(item.message)
        : formatSessionInteraction(item.interaction)
    ),
  ].map((content) => ({ content, role: "user" as const }))
}

/** Drain the session to the end of what has arrived and append it. The run
 *  reads its own history back from the transcript, so nothing is held in
 *  memory between steps. */
export async function appendSessionMessages(runtime: AgentRuntime) {
  const session = runtime.context.session

  if (session === null) {
    return false
  }

  let appended = false
  let hasMore = true

  while (hasMore) {
    const drained = await runtime.platform.drainSession({
      sessionId: session.id,
    })
    const messages = drainedBatchMessages(drained)

    hasMore = drained.hasMore

    if (messages.length > 0) {
      await runtime.platform.appendTranscript(messages)
      appended = true
    }
  }

  return appended
}

function sessionItems(drained: {
  interactions?: RuntimeInteraction[]
  messages: RuntimeMessage[]
}) {
  return [
    ...drained.messages.map((message) => ({
      at: message.observedAt ?? message.createdAt,
      message,
      type: "message" as const,
    })),
    ...(drained.interactions ?? []).map((interaction) => ({
      at: interaction.observedAt ?? interaction.createdAt,
      interaction,
      type: "interaction" as const,
    })),
  ].sort((left, right) => left.at - right.at)
}

function interactionPreview(interaction: RuntimeInteraction) {
  if (interaction.preview === null || interaction.preview.trim() === "") {
    return null
  }

  const action = interaction.type === "reaction.added" ? "Reacted" : "Removed"

  return `${action} ${interaction.reaction} ${targetText(interaction)}: "${truncatePreview(interaction.preview)}"`
}

function targetText(interaction: RuntimeInteraction) {
  const preposition = interaction.type === "reaction.added" ? "to" : "from"
  const target =
    interaction.target === "Jori"
      ? "Jori's message"
      : `${interaction.target}'s message`

  return `${preposition} ${target}`
}

function truncatePreview(value: string) {
  const normalized = collapseWhitespace(value)
  const limit = 220

  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 3)}...`
}
