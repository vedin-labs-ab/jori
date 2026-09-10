"use node"

import { v } from "convex/values"
import { defaultSelection } from "../../../contracts/models/selection"
import { internal } from "../../_generated/api"
import { internalAction } from "../../_generated/server"
import { sendOpenRouterChat } from "../../model/openrouter"
import { summaryOutputTokens } from "../limits"
import { type PendingSummary } from "./data"
import { conversationSummaryPrompt } from "./prompt"

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string" },
  },
}

export const run = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const pending = (await ctx.runQuery(
      internal.conversations.summary.data.pending,
      args
    )) as PendingSummary | null

    if (pending === null) {
      return null
    }

    if (pending.messages.length === 0) {
      await ctx.runMutation(internal.conversations.summary.data.clear, {
        ...args,
        functionId: pending.functionId,
      })
      return null
    }

    await ctx.runMutation(internal.conversations.summary.data.commit, {
      conversationId: args.conversationId,
      functionId: pending.functionId,
      summarizedAt: pending.readAt,
      summary: await summarizeConversation(pending),
    })

    return null
  },
})

async function summarizeConversation(input: PendingSummary) {
  const response = await sendOpenRouterChat({
    model: defaultSelection.model,
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
    messages: [{ content: conversationSummaryPrompt(input), role: "user" }],
  })

  return parseSummary(readContent(response))
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
