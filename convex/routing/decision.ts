import {
  type OpenRouterChatInput,
  type OpenRouterChatMessage,
  sendOpenRouterChat,
} from "../model"
import { promptTemplates } from "../prompts/generated"
import { type MessageRoutingContext } from "./context"
import { quickReplyDecision } from "./quick"

const defaultIntakeModel = "z-ai/glm-5.2"
const maxOutputTokens = 128
const defaultAddressedReply = "What can I help with?"
const intakeProviderRouting = {
  requireParameters: true,
  sort: "latency",
} as const

export type IntakeDecision = {
  error?: string
  model?: string
  reply?: string
  route: "agent" | "ignore" | "reply"
}

export async function decideRoute(
  context: MessageRoutingContext
): Promise<IntakeDecision> {
  if (!hasText(context.currentMessage.text)) {
    return { route: "ignore" }
  }

  const quickDecision = quickReplyDecision(context)

  if (quickDecision !== null) {
    return quickDecision
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
  return error instanceof Error
    ? error.message
    : "Message intake routing failed"
}

function createRequest(context: MessageRoutingContext): OpenRouterChatInput {
  return {
    maxTokens: maxOutputTokens,
    messages: routeMessages(context),
    model: readIntakeModel(),
    provider: intakeProviderRouting,
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "message_intake_decision",
        strict: true,
        schema: intakeDecisionSchema(),
      },
    },
  }
}

function routeMessages(
  context: MessageRoutingContext
): OpenRouterChatMessage[] {
  return [
    {
      role: "system",
      content: promptTemplates["routing/message"],
    },
    {
      role: "user",
      content: JSON.stringify(context),
    },
  ]
}

function intakeDecisionSchema() {
  return {
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["route"],
        properties: {
          route: { type: "string", enum: ["ignore"] },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["route", "reply"],
        properties: {
          route: { type: "string", enum: ["reply"] },
          reply: { type: "string", minLength: 1 },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["route"],
        properties: {
          route: { type: "string", enum: ["agent"] },
          reply: { type: "string", minLength: 1 },
        },
      },
    ],
  }
}

function normalizeDecision(
  value: unknown,
  context: MessageRoutingContext
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

function ignoredDecision(context: MessageRoutingContext): IntakeDecision {
  return addressedFallbackDecision(context) ?? { route: "ignore" }
}

function missingReplyDecision(context: MessageRoutingContext): IntakeDecision {
  const decision = addressedFallbackDecision(context)

  if (decision !== null) {
    return decision
  }

  throw new Error("Intake reply route requires reply.")
}

function addressedFallbackDecision(
  context: MessageRoutingContext
): IntakeDecision | null {
  if (context.activeExecution !== null) {
    return { route: "agent" }
  }

  if (isAddressedToMilo(context)) {
    return { reply: defaultAddressedReply, route: "reply" }
  }

  return null
}

function isAddressedToMilo(context: MessageRoutingContext) {
  return context.isDirect || context.isAddressed
}

function fallbackDecision(context: MessageRoutingContext): IntakeDecision {
  if (context.activeExecution !== null || context.isDirect) {
    return { route: "agent" }
  }

  return context.isAddressed ? { route: "agent" } : { route: "ignore" }
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
