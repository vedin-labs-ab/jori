import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { type ModelMessage } from "../model/types"
import { type ToolRuntime } from "../tool"
import {
  type DrainedSessionBatch,
  type RuntimeInteraction,
  type RuntimeMessage,
  type RuntimePrompt,
} from "../types"

// The prompt prefix every run starts with: instructions as the system
// message, then the organization, place, and requester person contexts
// (when present) and the run context as user messages, broad to narrow.
// Everything after the prefix is history.
export function promptMessages(prompt: RuntimePrompt): ModelMessage[] {
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

// Replaces the prompt prefix in place when the runtime context reloads,
// preserving the history that follows. The previous prompt says how long the
// prefix currently is; the next prompt says what it becomes.
export function replacePromptMessages(
  messages: ModelMessage[],
  previous: RuntimePrompt,
  next: RuntimePrompt
) {
  const length = promptMessages(previous).length

  if (messages.length < length || messages[0]?.role !== "system") {
    return
  }

  messages.splice(0, length, ...promptMessages(next))
}

export function formatSessionMessage(message: RuntimeMessage) {
  const observed = message.observedAt ?? message.createdAt

  return renderPromptTemplate(promptTemplates["agent/session/message"], {
    message: {
      actor: message.actor ?? "unknown",
      actorIds: message.actorIds.join(", "),
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

export async function appendSessionMessages(
  runtime: ToolRuntime,
  messages: ModelMessage[]
) {
  const session = runtime.context.session

  if (session === null) {
    return false
  }

  let appended = false
  let hasMore = true

  while (hasMore) {
    const drained = await runtime.convex.drainSessionMessages({
      sessionId: session.id,
    })

    hasMore = drained.hasMore

    if (appendDrainedBatch(runtime, messages, drained)) {
      appended = true
    }
  }

  return appended
}

// Appends the batch the runtime context load already drained, then keeps
// draining only when that batch was cut short.
export async function seedSessionMessages(
  runtime: ToolRuntime,
  messages: ModelMessage[]
) {
  const drained = runtime.context.drained

  if (drained === null) {
    return false
  }

  const appended = appendDrainedBatch(runtime, messages, drained)

  if (!drained.hasMore) {
    return appended
  }

  const more = await appendSessionMessages(runtime, messages)

  return appended || more
}

function appendDrainedBatch(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  drained: DrainedSessionBatch
) {
  let appended = false

  // Person context precedes the batch so a new speaker's bundle lands
  // before their first message.
  for (const content of drained.contexts ?? []) {
    messages.push({ content, role: "user" })
    appended = true
  }

  for (const item of sessionItems(drained)) {
    if (item.type === "message") {
      updateActiveSurfaceTarget(runtime, item.message)
    }

    messages.push({
      content:
        item.type === "message"
          ? formatSessionMessage(item.message)
          : formatSessionInteraction(item.interaction),
      role: "user",
    })
    appended = true
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
    interaction.target === "Milo"
      ? "Milo's message"
      : `${interaction.target}'s message`

  return `${preposition} ${target}`
}

function truncatePreview(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ")
  const limit = 220

  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 3)}...`
}

function updateActiveSurfaceTarget(
  runtime: ToolRuntime,
  message: RuntimeMessage
) {
  const activeSurface = runtime.context.activeSurface

  if (activeSurface !== null && message.replyTarget !== null) {
    activeSurface.target = message.replyTarget
  }
}
