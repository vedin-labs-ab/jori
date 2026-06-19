import { type Id } from "../_generated/dataModel"
import {
  type OpenRouterChatInput,
  type OpenRouterChatMessage,
  sendOpenRouterChat,
} from "../model"
import { promptTemplates } from "../prompts/generated"

const defaultIntakeModel = "minimax/minimax-m3"
const maxOutputTokens = 256
const defaultAddressedReply = "What can I help with?"

export type IntakeDecision = {
  error?: string
  model?: string
  reply?: string
  route: "agent" | "ignore" | "reply"
}

export type SlackRoutingContext = {
  activeExecution: {
    executionId: Id<"executions">
    latestStatus: string | null
    runId: Id<"runs">
    status: string
  } | null
  currentMessage: {
    actor: string | null
    createdAt: number
    id: Id<"messages">
    observedAt: number | null
    text: string
    type: string
  }
  isDirectMessage: boolean
  isMention: boolean
  recentMessages: Array<{
    actor: string | null
    createdAt: number
    id: Id<"messages">
    observedAt: number | null
    text: string
    type: string
  }>
}

export async function decideRoute(
  context: SlackRoutingContext
): Promise<IntakeDecision> {
  if (!hasText(context.currentMessage.text)) {
    return { route: "ignore" }
  }

  try {
    const response = await sendOpenRouterChat(createRequest(context))
    const text = readAssistantText(response)
    const decision = normalizeDecision(JSON.parse(text), context)

    return { ...decision, model: response.model }
  } catch (error) {
    return {
      ...fallbackDecision(context),
      error: formatRoutingError(error),
    }
  }
}

export function formatRoutingError(error: unknown) {
  return error instanceof Error ? error.message : "Slack intake routing failed"
}

function createRequest(context: SlackRoutingContext): OpenRouterChatInput {
  return {
    maxTokens: maxOutputTokens,
    messages: routeMessages(context),
    model: readIntakeModel(),
    provider: { requireParameters: true, sort: "latency" },
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "slack_intake_decision",
        strict: true,
        schema: intakeDecisionSchema(),
      },
    },
  }
}

function routeMessages(context: SlackRoutingContext): OpenRouterChatMessage[] {
  return [
    {
      role: "system",
      content: promptTemplates["routing/slack"],
    },
    {
      role: "user",
      content: JSON.stringify(context),
    },
  ]
}

function intakeDecisionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["route"],
    properties: {
      route: { type: "string", enum: ["ignore", "reply", "agent"] },
      reply: { type: "string" },
    },
  }
}

function normalizeDecision(
  value: unknown,
  context: SlackRoutingContext
): IntakeDecision {
  if (typeof value !== "object" || value === null) {
    throw new Error("Intake decision must be an object.")
  }

  const record = value as Record<string, unknown>
  const route = record.route
  const reply = normalizeReply(record.reply)

  if (route !== "ignore" && route !== "reply" && route !== "agent") {
    throw new Error("Intake decision route is invalid.")
  }

  if (route === "reply" && reply === undefined) {
    return missingReplyDecision(context)
  }

  if (route === "ignore") {
    return ignoredDecision(context)
  }

  return { route, ...(reply === undefined ? {} : { reply }) }
}

function ignoredDecision(context: SlackRoutingContext): IntakeDecision {
  return addressedFallbackDecision(context) ?? { route: "ignore" }
}

function missingReplyDecision(context: SlackRoutingContext): IntakeDecision {
  const decision = addressedFallbackDecision(context)

  if (decision !== null) {
    return decision
  }

  throw new Error("Intake reply route requires reply.")
}

function addressedFallbackDecision(
  context: SlackRoutingContext
): IntakeDecision | null {
  if (context.activeExecution !== null) {
    return { route: "agent" }
  }

  if (isAddressedToMilo(context)) {
    return { reply: defaultAddressedReply, route: "reply" }
  }

  return null
}

function isAddressedToMilo(context: SlackRoutingContext) {
  return context.isDirectMessage || context.isMention
}

function fallbackDecision(context: SlackRoutingContext): IntakeDecision {
  if (context.activeExecution !== null || context.isDirectMessage) {
    return { route: "agent" }
  }

  return context.isMention ? { route: "agent" } : { route: "ignore" }
}

function readAssistantText(
  response: Awaited<ReturnType<typeof sendOpenRouterChat>>
) {
  const choice = response.choices[0]
  const content = choice?.message.content

  if (choice?.finishReason === "length") {
    throw new Error("Intake model response was truncated.")
  }

  if (typeof content === "string" && content.trim() !== "") {
    return content
  }

  throw new Error("Intake model returned empty content.")
}

function normalizeReply(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

function hasText(value: string) {
  return value.trim() !== ""
}

function readIntakeModel() {
  const model = process.env.OPENROUTER_INTAKE_MODEL?.trim()

  return model === undefined || model === "" ? defaultIntakeModel : model
}
