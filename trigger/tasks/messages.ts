import { promptTemplates } from "../../convex/prompts/generated"
import { renderPromptTemplate } from "../../convex/prompts/render"
import { type ModelMessage } from "../model/types"
import { type ToolRuntime } from "../tool"
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

    for (const message of drained.messages) {
      messages.push({
        content: formatSessionMessage(message),
        role: "user",
      })
      appended = true
    }
  }

  return appended
}
