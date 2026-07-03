import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { type ModelMessage } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type RuntimeInteraction, type RuntimeMessage } from "../types"

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
  }).trim()
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
  }).trim()
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
