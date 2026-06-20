import {
  type OpenRouterChatInput,
  type OpenRouterChatMessage,
  sendOpenRouterChat,
} from "../model"
import { promptTemplates } from "../prompts/generated"
import { type MessageRoutingContext } from "./context"

const defaultIntakeModel = "z-ai/glm-5.2"
const maxOutputTokens = 128
const intakeProviderRouting = {
  requireParameters: true,
  sort: "latency",
} as const

export type IntakeDecision = {
  error?: string
  model?: string
  reply?: string
  route: "agent" | "ignore" | "respond"
}

export async function decideRoute(
  context: MessageRoutingContext
): Promise<IntakeDecision> {
  if (!hasText(context.currentMessage.text)) {
    return { route: "ignore" }
  }

  try {
    const response = await sendOpenRouterChat(createRequest(context))
    const text = readAssistantText(response)
    const decision = normalizeDecision(parseDecisionJson(text))

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
      content: promptTemplates.routing,
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
        required: ["route", "message"],
        properties: {
          route: { type: "string", enum: ["respond"] },
          message: { type: "string", minLength: 1 },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["route"],
        properties: {
          route: { type: "string", enum: ["agent"] },
          message: { type: "string", minLength: 1 },
        },
      },
    ],
  }
}

function normalizeDecision(value: unknown): IntakeDecision {
  if (typeof value !== "object" || value === null) {
    throw new Error("Intake decision must be an object.")
  }

  const record = value as Record<string, unknown>
  const route = record.route
  const reply = normalizeReply(record.message) ?? normalizeReply(record.reply)

  if (route !== "ignore" && route !== "respond" && route !== "agent") {
    throw new Error("Intake decision route is invalid.")
  }

  if (route === "ignore") {
    return { route }
  }

  if (route === "respond" && reply === undefined) {
    return { route: "ignore" }
  }

  return {
    route,
    ...(reply === undefined ? {} : { reply }),
  }
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

function parseDecisionJson(text: string) {
  try {
    return JSON.parse(text)
  } catch (error) {
    const extracted = extractJsonObject(text)

    if (extracted === null) {
      throw error
    }

    return JSON.parse(extracted)
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start === -1 || end <= start) {
    return null
  }

  return text.slice(start, end + 1)
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
