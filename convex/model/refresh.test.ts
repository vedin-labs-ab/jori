import { expect, test, vi } from "vitest"
import { readModelListing } from "./refresh"

vi.mock("@openrouter/sdk/core", () => ({ OpenRouterCore: class {} }))
vi.mock("@openrouter/sdk/funcs/modelsGet", () => ({ modelsGet: vi.fn() }))

const pricing = { prompt: "0.000002", completion: "0.00001" }

test("takes the smaller of the model's and the provider's window, and the rate in micros", () => {
  expect(
    readModelListing("openai/gpt-x", {
      contextLength: 400_000,
      pricing,
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
    rate: { inputMicrosPerToken: 2, outputMicrosPerToken: 10 },
  })
})

test("a listing without a provider window or completion cap keeps the model's", () => {
  expect(
    readModelListing("openai/gpt-x", {
      contextLength: 400_000,
      pricing: { prompt: "0.0000002", completion: "0.0000012" },
      topProvider: { isModerated: false },
    })
  ).toEqual({
    contextLength: 400_000,
    model: "openai/gpt-x",
    rate: {
      inputMicrosPerToken: expect.closeTo(0.2, 9),
      outputMicrosPerToken: expect.closeTo(1.2, 9),
    },
  })
})

test("a listing with no window or no usable price is an error, not a silent fallback", () => {
  expect(() =>
    readModelListing("openai/gpt-x", {
      contextLength: null,
      pricing,
      topProvider: { contextLength: null, isModerated: false },
    })
  ).toThrow("OpenRouter lists no context length for openai/gpt-x.")
  expect(() =>
    readModelListing("openai/gpt-x", {
      contextLength: 400_000,
      pricing: { prompt: "free", completion: "0" },
      topProvider: { isModerated: false },
    })
  ).toThrow("OpenRouter lists no usable price for openai/gpt-x.")
})
