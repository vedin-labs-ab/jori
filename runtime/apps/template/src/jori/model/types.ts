import { type z } from "zod"
import { type JsonObject } from "../json"

export type JoriPromptInput<TSchema extends z.ZodType = z.ZodType> = {
  instruction: string
  input?: unknown
  schema: TSchema
  schemaName: string
  schemaDescription?: string
  /**
   * Maximum generated response tokens. Output only.
   * Defaults to 1000. Allowed range: 64-16000.
   */
  maxOutputTokens?: number
}

export type JoriPromptResult<T> = {
  output: T
  text: string
  diagnostics: JoriPromptDiagnostics
  model: string
  usage?: unknown
}

export type JoriPromptDiagnostics = {
  durationMs: number
  generationId: string
  model: string
  provider?: {
    attempt: number
    availableEndpoints: number
    region: string | null
    requested: string
    selectedModel?: string
    selectedProvider?: string
    strategy: string
    summary: string
  }
  request: {
    maxOutputTokens: number
    messageBytes: number
    reasoningEffort: "none"
    responseFormat: "json_schema"
    schemaBytes: number
  }
  serviceTier?: string | null
  usage?: {
    completionTokens?: number
    promptCacheReadTokens?: number
    promptCacheWriteTokens?: number
    promptTokens?: number
    promptUncachedTokens?: number
    reasoningTokens?: number
    totalTokens?: number
  }
}

export type RawPromptInput = {
  instruction: string
  input?: unknown
  outputSchema: JsonObject
  outputSchemaDescription?: string
  outputSchemaName: string
  maxOutputTokens?: number
}

export type RawPromptResult = {
  output: unknown
  text: string
  diagnostics: JoriPromptDiagnostics
  model: string
  usage?: unknown
}
