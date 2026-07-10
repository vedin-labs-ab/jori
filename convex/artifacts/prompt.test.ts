import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type ArtifactPlatformContext } from "./tools/platform"
import {
  createArtifactPromptRequest,
  createArtifactPromptRequestDiagnostics,
  normalizeArtifactPromptInput,
  parsePromptOutput,
  readArtifactModel,
} from "./tools/prompt"

function restoreArtifactModel(value: string | undefined) {
  if (value === undefined) {
    delete process.env.OPENROUTER_ARTIFACT_MODEL
    return
  }

  process.env.OPENROUTER_ARTIFACT_MODEL = value
}

function promptArgs(overrides: Record<string, unknown> = {}) {
  return {
    instruction: "Classify this email.",
    outputSchemaName: "email_triage",
    outputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["priority"],
      properties: {
        priority: { type: "string", enum: ["low", "high"] },
      },
    },
    ...overrides,
  }
}

function platformContext(): ArtifactPlatformContext {
  return {
    tenantId: "tenant",
    artifactId: "artifact" as Id<"artifacts">,
    versionId: "version" as Id<"artifactVersions">,
    personId: "person" as Id<"persons">,
  }
}

describe("artifact prompt model contract", () => {
  test("uses GPT-5.6 Sol by default while allowing env overrides", () => {
    const originalModel = process.env.OPENROUTER_ARTIFACT_MODEL

    try {
      process.env.OPENROUTER_ARTIFACT_MODEL = ""
      expect(readArtifactModel()).toBe("openai/gpt-5.6-sol")

      process.env.OPENROUTER_ARTIFACT_MODEL = "z-ai/glm-5.2"
      expect(readArtifactModel()).toBe("z-ai/glm-5.2")
    } finally {
      restoreArtifactModel(originalModel)
    }
  })

  test("requires a named object output schema", () => {
    expect(normalizeArtifactPromptInput(promptArgs())).toMatchObject({
      instruction: "Classify this email.",
      outputSchemaName: "email_triage",
    })
  })
})

describe("artifact prompt schema validation", () => {
  test("normalizes schema metadata and rejects schema references", () => {
    expect(
      normalizeArtifactPromptInput(
        promptArgs({
          outputSchema: {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            type: "object",
            properties: { priority: { type: "string" } },
          },
        })
      ).outputSchema
    ).toEqual({
      type: "object",
      properties: { priority: { type: "string" } },
    })

    expect(() =>
      normalizeArtifactPromptInput(
        promptArgs({
          outputSchema: { type: "object", $ref: "#/$defs/Result" },
        })
      )
    ).toThrow("fully inlined")
  })

  test("rejects missing and non-object schemas", () => {
    expect(() =>
      normalizeArtifactPromptInput(promptArgs({ outputSchema: undefined }))
    ).toThrow("outputSchema must be a JSON Schema object.")

    expect(() =>
      normalizeArtifactPromptInput(
        promptArgs({
          outputSchema: { type: "array", items: { type: "string" } },
        })
      )
    ).toThrow("outputSchema must describe a JSON object.")
  })

  test("rejects invalid schema names", () => {
    expect(() =>
      normalizeArtifactPromptInput(
        promptArgs({ outputSchemaName: "email triage" })
      )
    ).toThrow(
      "outputSchemaName must use letters, numbers, underscores, or dashes."
    )
  })

  test("throws when model output is not valid JSON", () => {
    expect(parsePromptOutput('{"priority":"high"}')).toEqual({
      priority: "high",
    })
    expect(() => parsePromptOutput("not json")).toThrow(
      "Artifact prompt model returned invalid JSON."
    )
  })
})

describe("artifact prompt provider request", () => {
  test("maps output token budget to OpenRouter max_tokens", () => {
    const input = normalizeArtifactPromptInput(
      promptArgs({ maxOutputTokens: 2000 })
    )
    const request = createArtifactPromptRequest(platformContext(), input)

    expect(request.maxTokens).toBe(2000)
    expect("maxCompletionTokens" in request).toBe(false)
    expect(request.provider).toEqual({
      requireParameters: true,
      sort: "latency",
    })
    expect(request.reasoning).toEqual({ effort: "medium" })
    expect(request.plugins).toBeUndefined()
  })

  test("summarizes request diagnostics without payload content", () => {
    const input = normalizeArtifactPromptInput(
      promptArgs({ input: { subject: "hello" }, maxOutputTokens: 512 })
    )
    const request = createArtifactPromptRequest(platformContext(), input)

    expect(createArtifactPromptRequestDiagnostics(request, input)).toEqual({
      maxOutputTokens: 512,
      messageBytes: expect.any(Number),
      reasoningEffort: "medium",
      responseFormat: "json_schema",
      schemaBytes: expect.any(Number),
    })
  })
})

describe("artifact prompt output token budget", () => {
  test("defaults to 1000 and accepts the supported range", () => {
    expect(normalizeArtifactPromptInput(promptArgs()).maxOutputTokens).toBe(
      1000
    )
    expect(
      normalizeArtifactPromptInput(promptArgs({ maxOutputTokens: 64 }))
        .maxOutputTokens
    ).toBe(64)
    expect(
      normalizeArtifactPromptInput(promptArgs({ maxOutputTokens: 16_000 }))
        .maxOutputTokens
    ).toBe(16_000)
  })

  test("accepts legacy maxTokens as a runtime alias", () => {
    expect(
      normalizeArtifactPromptInput(promptArgs({ maxTokens: 5000 }))
        .maxOutputTokens
    ).toBe(5000)
  })

  test("rejects unclear or unsupported token budget values", () => {
    expect(() =>
      normalizeArtifactPromptInput(
        promptArgs({ maxOutputTokens: 5000, maxTokens: 5000 })
      )
    ).toThrow("Use maxOutputTokens instead of maxTokens.")
    expect(() =>
      normalizeArtifactPromptInput(promptArgs({ maxOutputTokens: 63 }))
    ).toThrow("maxOutputTokens must be between 64 and 16000.")
    expect(() =>
      normalizeArtifactPromptInput(promptArgs({ maxOutputTokens: 16_001 }))
    ).toThrow("maxOutputTokens must be between 64 and 16000.")
    expect(() =>
      normalizeArtifactPromptInput(promptArgs({ maxOutputTokens: 100.5 }))
    ).toThrow("maxOutputTokens must be an integer.")
  })
})
