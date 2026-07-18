"use node"

import { assertJsonSerializable } from "../../../contracts/artifacts/json"
import {
  assertSupportedJsonSchema,
  normalizeJsonSchema,
} from "../../../contracts/artifacts/schema"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import {
  type OpenRouterChatInput,
  type OpenRouterChatMessage,
  sendOpenRouterChat,
} from "../../model"
import { readEnvironmentVariable } from "../../shared/environment"
import { optionalString, requiredString } from "../../shared/input"
import {
  type ArtifactPromptRequestDiagnostics,
  createArtifactPromptDiagnostics,
} from "./diagnostics"
import { type ArtifactPlatformContext } from "./platform"

export type ArtifactPromptInput = {
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
const defaultArtifactPromptModel = "openai/gpt-5.6-sol"
const artifactReasoningEffort = "medium"

export async function promptModel(
  context: ArtifactPlatformContext,
  args: Record<string, unknown>
) {
  const input = normalizeArtifactPromptInput(args)
  const request = createArtifactPromptRequest(context, input)
  const startedAt = Date.now()
  const response = await sendOpenRouterChat(request)
  const durationMs = Date.now() - startedAt
  const text = readAssistantText(response)

  return {
    text,
    output: parsePromptOutput(text),
    diagnostics: createArtifactPromptDiagnostics(
      response,
      durationMs,
      createArtifactPromptRequestDiagnostics(request, input)
    ),
    model: response.model,
    usage: response.usage,
  }
}

export function createArtifactPromptRequest(
  context: ArtifactPlatformContext,
  input: ArtifactPromptInput
): OpenRouterChatInput {
  return {
    model: readArtifactModel(),
    messages: promptMessages(context, input),
    maxTokens: input.maxOutputTokens,
    provider: { requireParameters: true, sort: "latency" },
    reasoning: { effort: artifactReasoningEffort },
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

export function createArtifactPromptRequestDiagnostics(
  request: OpenRouterChatInput,
  input: ArtifactPromptInput
): ArtifactPromptRequestDiagnostics {
  return {
    maxOutputTokens: input.maxOutputTokens,
    messageBytes: encodedJsonBytes(request.messages),
    reasoningEffort: artifactReasoningEffort,
    responseFormat: "json_schema",
    schemaBytes: encodedJsonBytes(input.outputSchema),
  }
}

export function normalizeArtifactPromptInput(
  args: Record<string, unknown>
): ArtifactPromptInput {
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
    throw new Error("Artifact prompt model returned invalid JSON.")
  }
}

function promptMessages(
  context: ArtifactPlatformContext,
  input: ArtifactPromptInput
): OpenRouterChatMessage[] {
  return [
    {
      role: "system",
      content: renderPromptTemplate(promptTemplates["artifacts/model"], {
        artifact: {
          instruction: input.instruction,
        },
      }),
    },
    {
      role: "user",
      content: JSON.stringify({
        artifactId: context.artifactId,
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

export function readArtifactModel() {
  return (
    readEnvironmentVariable("OPENROUTER_ARTIFACT_MODEL") ??
    defaultArtifactPromptModel
  )
}

function readAssistantText(
  response: Awaited<ReturnType<typeof sendOpenRouterChat>>
) {
  const choice = response.choices[0]

  if (choice === undefined) {
    throw new Error("Artifact prompt model returned no choices.")
  }

  if (choice.finishReason === "length") {
    throw new Error("Artifact prompt model response was truncated.")
  }

  const content = choice.message.content

  if (typeof content === "string" && content.trim() !== "") {
    return content
  }

  throw new Error("Artifact prompt model returned empty content.")
}
