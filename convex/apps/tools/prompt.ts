"use node"

import { assertJsonSerializable } from "../../../contracts/apps/json"
import {
  assertSupportedJsonSchema,
  normalizeJsonSchema,
} from "../../../contracts/apps/schema"
import { miloModel } from "../../../contracts/billing"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import {
  type OpenRouterChatInput,
  type OpenRouterChatMessage,
  sendOpenRouterChat,
} from "../../model"
import { optionalString, requiredString } from "../../shared/input"
import {
  type AppPromptRequestDiagnostics,
  createAppPromptDiagnostics,
} from "./diagnostics"
import { type AppPlatformContext } from "./platform"

export type AppPromptInput = {
  instruction: string
  input: unknown
  maxOutputTokens: number
  outputSchema: Record<string, unknown>
  outputSchemaDescription?: string
  outputSchemaName: string
}

const schemaNamePattern = /^[A-Za-z0-9_-]{1,64}$/
const maxSchemaBytes = 64 * 1024
const defaultPromptOutputTokens = 1000
const minPromptOutputTokens = 64
const maxPromptOutputTokens = 16_000
const appReasoningEffort = "medium"

export async function promptModel(
  context: AppPlatformContext,
  args: Record<string, unknown>
) {
  const input = normalizeAppPromptInput(args)
  const request = createAppPromptRequest(context, input)
  const startedAt = Date.now()
  const response = await sendOpenRouterChat(request)
  const durationMs = Date.now() - startedAt
  const text = readAssistantText(response)

  return {
    text,
    output: parsePromptOutput(text),
    diagnostics: createAppPromptDiagnostics(
      response,
      durationMs,
      createAppPromptRequestDiagnostics(request, input)
    ),
    model: response.model,
    usage: response.usage,
  }
}

export function createAppPromptRequest(
  context: AppPlatformContext,
  input: AppPromptInput
): OpenRouterChatInput {
  return {
    model: miloModel,
    messages: promptMessages(context, input),
    maxTokens: input.maxOutputTokens,
    provider: { requireParameters: true, sort: "latency" },
    reasoning: { effort: appReasoningEffort },
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: input.outputSchemaName,
        strict: true,
        schema: input.outputSchema,
        ...(input.outputSchemaDescription === undefined
          ? {}
          : { description: input.outputSchemaDescription }),
      },
    },
  }
}

export function createAppPromptRequestDiagnostics(
  request: OpenRouterChatInput,
  input: AppPromptInput
): AppPromptRequestDiagnostics {
  return {
    maxOutputTokens: input.maxOutputTokens,
    messageBytes: encodedJsonBytes(request.messages),
    reasoningEffort: appReasoningEffort,
    responseFormat: "json_schema",
    schemaBytes: encodedJsonBytes(input.outputSchema),
  }
}

export function normalizeAppPromptInput(
  args: Record<string, unknown>
): AppPromptInput {
  return {
    instruction: requiredString(args.instruction, "instruction"),
    input: args.input ?? null,
    maxOutputTokens: normalizeMaxOutputTokens(args),
    outputSchema: normalizeOutputSchema(args.outputSchema),
    outputSchemaDescription: optionalString(args.outputSchemaDescription),
    outputSchemaName: normalizeOutputSchemaName(args.outputSchemaName),
  }
}

export function parsePromptOutput(text: string) {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error("App prompt model returned invalid JSON.")
  }
}

function promptMessages(
  context: AppPlatformContext,
  input: AppPromptInput
): OpenRouterChatMessage[] {
  return [
    {
      role: "system",
      content: renderPromptTemplate(promptTemplates["apps/model"], {
        app: {
          instruction: input.instruction,
        },
      }),
    },
    {
      role: "user",
      content: JSON.stringify({
        appId: context.appId,
        versionId: context.versionId,
        input: input.input,
      }),
    },
  ]
}

function normalizeOutputSchema(value: unknown) {
  const schema = normalizeJsonSchema(value, "outputSchema")

  assertSupportedJsonSchema(schema)
  assertJsonSerializable({
    label: "outputSchema",
    maxBytes: maxSchemaBytes,
    value: schema,
  })
  return schema
}

function normalizeOutputSchemaName(value: unknown) {
  const name = requiredString(value, "outputSchemaName")

  if (!schemaNamePattern.test(name)) {
    throw new Error(
      "outputSchemaName must use letters, numbers, underscores, or dashes."
    )
  }

  return name
}

function normalizeMaxOutputTokens(args: Record<string, unknown>) {
  const value = readMaxOutputTokens(args)

  if (value === undefined || value === null) {
    return defaultPromptOutputTokens
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("maxOutputTokens must be an integer.")
  }

  if (value < minPromptOutputTokens || value > maxPromptOutputTokens) {
    throw new Error(
      `maxOutputTokens must be between ${minPromptOutputTokens} and ${maxPromptOutputTokens}.`
    )
  }

  return value
}

function readMaxOutputTokens(args: Record<string, unknown>) {
  const hasMaxOutputTokens = Object.hasOwn(args, "maxOutputTokens")
  const hasMaxTokens = Object.hasOwn(args, "maxTokens")

  if (hasMaxOutputTokens && hasMaxTokens) {
    throw new Error("Use maxOutputTokens instead of maxTokens.")
  }

  if (hasMaxOutputTokens) {
    return args.maxOutputTokens
  }

  return hasMaxTokens ? args.maxTokens : undefined
}

function encodedJsonBytes(value: unknown) {
  const encoded = JSON.stringify(value)

  return encoded === undefined
    ? 0
    : new TextEncoder().encode(encoded).byteLength
}

function readAssistantText(
  response: Awaited<ReturnType<typeof sendOpenRouterChat>>
) {
  const choice = response.choices[0]

  if (choice === undefined) {
    throw new Error("App prompt model returned no choices.")
  }

  if (choice.finishReason === "length") {
    throw new Error("App prompt model response was truncated.")
  }

  const content = choice.message.content

  if (typeof content === "string" && content.trim() !== "") {
    return content
  }

  throw new Error("App prompt model returned empty content.")
}
