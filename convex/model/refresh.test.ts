import { expect, test, vi } from "vitest"
import { readModelWindow } from "./refresh"

vi.mock("@openrouter/sdk/core", () => ({ OpenRouterCore: class {} }))
vi.mock("@openrouter/sdk/funcs/modelsGet", () => ({ modelsGet: vi.fn() }))

test("takes the smaller of the model's and the provider's window", () => {
  expect(
    readModelWindow("openai/gpt-x", {
      contextLength: 400_000,
      topProvider: {
        contextLength: 272_000,
        isModerated: false,
        maxCompletionTokens: 128_000,
      },
    })
  ).toEqual({
    contextLength: 272_000,
    model: "openai/gpt-x",
    maxCompletionTokens: 128_000,
  })
})

test("a listing without a provider window or completion cap keeps the model's", () => {
  expect(
    readModelWindow("openai/gpt-x", {
      contextLength: 400_000,
      topProvider: { isModerated: false },
    })
  ).toEqual({ contextLength: 400_000, model: "openai/gpt-x" })
})

test("a listing with no window at all is an error, not a silent fallback", () => {
  expect(() =>
    readModelWindow("openai/gpt-x", {
      contextLength: null,
      topProvider: { contextLength: null, isModerated: false },
    })
  ).toThrow("OpenRouter lists no context length for openai/gpt-x.")
})
