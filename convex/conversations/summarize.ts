"use node"

import { v } from "convex/values"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { type OpenRouterChatMessage, sendOpenRouterChat } from "../model"
import { summaryOutputTokens } from "./limits"
import { type PendingSummary, type SummaryMessage } from "./summary"

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string" },
  },
}
const defaultSummaryModel = "openai/gpt-5.5"

export const run = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const pending = (await ctx.runQuery(
      internal.conversations.summary.pending,
      args
    )) as PendingSummary | null

    if (pending === null || pending.messages.length === 0) {
      await ctx.runMutation(internal.conversations.summary.clear, args)
      return null
    }

    await ctx.runMutation(internal.conversations.summary.commit, {
      conversationId: args.conversationId,
      summarizedAt: pending.readAt,
      summary: await summarizeConversation(pending),
    })

    return null
  },
})

async function summarizeConversation(input: PendingSummary) {
  const response = await sendOpenRouterChat({
    model: readSummaryModel(),
    maxTokens: summaryOutputTokens,
    provider: { requireParameters: true, sort: "latency" },
    reasoning: { effort: "low" },
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "conversation_summary",
        strict: true,
        schema: summarySchema,
      },
    },
    messages: summaryMessages(input),
  })

  return parseSummary(readContent(response))
}

function summaryMessages(input: PendingSummary): OpenRouterChatMessage[] {
  return [
    {
      role: "user",
      content: renderPromptTemplate(promptTemplates["conversations/summary"], {
        conversation: {
          messages: input.messages.map(formatMessage).join("\n\n"),
          summary: input.priorSummary,
        },
      }),
    },
  ]
}

function formatMessage(message: SummaryMessage) {
  const observedAt = message.observedAt ?? message.createdAt

  return [
    `${new Date(observedAt).toISOString()} | ${message.speaker} | ${message.actor}`,
    message.text,
  ].join("\n")
}

function readSummaryModel() {
  const model = process.env.OPENROUTER_SUMMARY_MODEL?.trim()

  return model === undefined || model === "" ? defaultSummaryModel : model
}

function readContent(response: Awaited<ReturnType<typeof sendOpenRouterChat>>) {
  const choice = response.choices[0]

  if (choice === undefined) {
    throw new Error("Conversation summary model returned no choices.")
  }

  if (choice.finishReason === "length") {
    throw new Error("Conversation summary model response was truncated.")
  }

  const content = choice.message.content

  if (typeof content === "string" && content.trim() !== "") {
    return content
  }

  throw new Error("Conversation summary model returned empty content.")
}

function parseSummary(text: string) {
  try {
    const value: unknown = JSON.parse(text)

    return readSummaryValue(value)
  } catch {
    throw new Error("Conversation summary model returned invalid JSON.")
  }
}

function readSummaryValue(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("summary" in value) ||
    typeof value.summary !== "string"
  ) {
    throw new Error("Conversation summary model returned invalid summary.")
  }

  return value.summary
}
