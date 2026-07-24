import { expect, test } from "vitest"
import { createAppPromptDiagnostics } from "./tools/diagnostics"

const response = {
  id: "gen-123",
  model: "z-ai/glm-5.2",
  openrouterMetadata: {
    attempt: 2,
    endpoints: {
      available: [
        {
          model: "z-ai/glm-5.2",
          provider: "slow-provider",
          selected: false,
        },
        {
          model: "z-ai/glm-5.2",
          provider: "fast-provider",
          selected: true,
        },
      ],
      total: 5,
    },
    region: "eu",
    requested: "z-ai/glm-5.2",
    strategy: "direct",
    summary: "selected fast-provider",
  },
  serviceTier: "default",
  usage: {
    completionTokens: 25,
    completionTokensDetails: { reasoningTokens: 5 },
    promptTokensDetails: {
      cachedTokens: 60,
      cacheWriteTokens: 10,
    },
    promptTokens: 100,
    totalTokens: 125,
  },
}

const request = {
  maxOutputTokens: 1000,
  messageBytes: 300,
  reasoningEffort: "none" as const,
  responseFormat: "json_schema" as const,
  schemaBytes: 200,
}

const diagnostics = {
  durationMs: 1234,
  generationId: "gen-123",
  model: "z-ai/glm-5.2",
  provider: {
    attempt: 2,
    availableEndpoints: 5,
    region: "eu",
    requested: "z-ai/glm-5.2",
    selectedModel: "z-ai/glm-5.2",
    selectedProvider: "fast-provider",
    strategy: "direct",
    summary: "selected fast-provider",
  },
  request,
  serviceTier: "default",
  usage: {
    completionTokens: 25,
    promptCacheReadTokens: 60,
    promptCacheWriteTokens: 10,
    promptTokens: 100,
    promptUncachedTokens: 40,
    reasoningTokens: 5,
    totalTokens: 125,
  },
}

test("summarizes app prompt routing diagnostics", () => {
  expect(createAppPromptDiagnostics(response, 1234.9, request)).toEqual(
    diagnostics
  )
})
