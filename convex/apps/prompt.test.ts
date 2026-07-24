import { describe, expect, test } from "vitest"
import { miloModel } from "../../contracts/billing"
import { type Id } from "../_generated/dataModel"
import { type AppPlatformContext } from "./tools/platform"
import {
  createAppPromptRequest,
  createAppPromptRequestDiagnostics,
  normalizeAppPromptInput,
  parsePromptOutput,
} from "./tools/prompt"

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

function platformContext(): AppPlatformContext {
  return {
    organizationId: "organization",
    appId: "app" as Id<"apps">,
    versionId: "version" as Id<"appVersions">,
    personId: "person" as Id<"persons">,
    grant: "member",
  }
}

describe("app prompt model contract", () => {
  test("uses Milo's one model, with no deployment override", () => {
    expect(
      createAppPromptRequest(
        platformContext(),
        normalizeAppPromptInput(promptArgs())
      ).model
    ).toBe(miloModel)
  })

  test("requires a named object output schema", () => {
    expect(normalizeAppPromptInput(promptArgs())).toMatchObject({
      instruction: "Classify this email.",
      outputSchemaName: "email_triage",
    })
  })
})

describe("app prompt schema validation", () => {
  test("normalizes schema metadata and rejects schema references", () => {
    expect(
      normalizeAppPromptInput(
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
      normalizeAppPromptInput(
        promptArgs({
          outputSchema: { type: "object", $ref: "#/$defs/Result" },
        })
      )
    ).toThrow("fully inlined")
  })

  test("rejects missing and non-object schemas", () => {
    expect(() =>
      normalizeAppPromptInput(promptArgs({ outputSchema: undefined }))
    ).toThrow("outputSchema must be a JSON Schema object.")

    expect(() =>
      normalizeAppPromptInput(
        promptArgs({
          outputSchema: { type: "array", items: { type: "string" } },
        })
      )
    ).toThrow("outputSchema must describe a JSON object.")
  })

  test("rejects invalid schema names", () => {
    expect(() =>
      normalizeAppPromptInput(promptArgs({ outputSchemaName: "email triage" }))
    ).toThrow(
      "outputSchemaName must use letters, numbers, underscores, or dashes."
    )
  })

  test("throws when model output is not valid JSON", () => {
    expect(parsePromptOutput('{"priority":"high"}')).toEqual({
      priority: "high",
    })
    expect(() => parsePromptOutput("not json")).toThrow(
      "App prompt model returned invalid JSON."
    )
  })
})

describe("app prompt provider request", () => {
  test("maps output token budget to OpenRouter max_tokens", () => {
    const input = normalizeAppPromptInput(promptArgs({ maxOutputTokens: 2000 }))
    const request = createAppPromptRequest(platformContext(), input)

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
    const input = normalizeAppPromptInput(
      promptArgs({ input: { subject: "hello" }, maxOutputTokens: 512 })
    )
    const request = createAppPromptRequest(platformContext(), input)

    expect(createAppPromptRequestDiagnostics(request, input)).toEqual({
      maxOutputTokens: 512,
      messageBytes: expect.any(Number),
      reasoningEffort: "medium",
      responseFormat: "json_schema",
      schemaBytes: expect.any(Number),
    })
  })
})

describe("app prompt output token budget", () => {
  test("defaults to 1000 and accepts the supported range", () => {
    expect(normalizeAppPromptInput(promptArgs()).maxOutputTokens).toBe(1000)
    expect(
      normalizeAppPromptInput(promptArgs({ maxOutputTokens: 64 }))
        .maxOutputTokens
    ).toBe(64)
    expect(
      normalizeAppPromptInput(promptArgs({ maxOutputTokens: 16_000 }))
        .maxOutputTokens
    ).toBe(16_000)
  })

  test("accepts legacy maxTokens as a runtime alias", () => {
    expect(
      normalizeAppPromptInput(promptArgs({ maxTokens: 5000 })).maxOutputTokens
    ).toBe(5000)
  })

  test("rejects unclear or unsupported token budget values", () => {
    expect(() =>
      normalizeAppPromptInput(
        promptArgs({ maxOutputTokens: 5000, maxTokens: 5000 })
      )
    ).toThrow("Use maxOutputTokens instead of maxTokens.")
    expect(() =>
      normalizeAppPromptInput(promptArgs({ maxOutputTokens: 63 }))
    ).toThrow("maxOutputTokens must be between 64 and 16000.")
    expect(() =>
      normalizeAppPromptInput(promptArgs({ maxOutputTokens: 16_001 }))
    ).toThrow("maxOutputTokens must be between 64 and 16000.")
    expect(() =>
      normalizeAppPromptInput(promptArgs({ maxOutputTokens: 100.5 }))
    ).toThrow("maxOutputTokens must be an integer.")
  })
})
