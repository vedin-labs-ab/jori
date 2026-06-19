import { expect, test } from "vitest"
import { createArtifactPromptDiagnostics } from "./tools/diagnostics"

const response = {
  id: "gen-123",
  model: "minimax/minimax-m3",
  openrouterMetadata: {
    attempt: 2,
    endpoints: {
      available: [
        {
          model: "minimax/minimax-m3",
          provider: "slow-provider",
          selected: false,
        },
        {
          model: "minimax/minimax-m3",
          provider: "fast-provider",
          selected: true,
        },
      ],
      total: 5,
    },
    region: "eu",
    requested: "minimax/minimax-m3",
    strategy: "direct",
    summary: "selected fast-provider",
  },
  serviceTier: "default",
  usage: {
    completionTokens: 25,
    completionTokensDetails: { reasoningTokens: 5 },
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
  model: "minimax/minimax-m3",
  provider: {
    attempt: 2,
    availableEndpoints: 5,
    region: "eu",
    requested: "minimax/minimax-m3",
    selectedModel: "minimax/minimax-m3",
    selectedProvider: "fast-provider",
    strategy: "direct",
    summary: "selected fast-provider",
  },
  request,
  serviceTier: "default",
  usage: {
    completionTokens: 25,
    promptTokens: 100,
    reasoningTokens: 5,
    totalTokens: 125,
  },
}

test("summarizes artifact prompt routing diagnostics", () => {
  expect(createArtifactPromptDiagnostics(response, 1234.9, request)).toEqual(
    diagnostics
  )
})
