import { expect, test } from "vitest"
import { vertexUsage } from "./usage"

test("prices a 1K image separately from text input", () => {
  expect(
    vertexUsage({
      promptTokenCount: 17,
      candidatesTokenCount: 1120,
      candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
    })
  ).toEqual({ micros: 73930, tokens: { input: 17, output: 1120 } })
})

test("prices thinking, text, and cached input at their own rates", () => {
  expect(
    vertexUsage({
      promptTokenCount: 100,
      cachedContentTokenCount: 20,
      candidatesTokenCount: 1130,
      thoughtsTokenCount: 100,
      candidatesTokensDetails: [
        { modality: "IMAGE", tokenCount: 1120 },
        { modality: "TEXT", tokenCount: 10 },
      ],
    })
  ).toEqual({ micros: 74329, tokens: { input: 100, output: 1230 } })
})

test("handles protobuf zero fields and a safety response without output", () => {
  expect(vertexUsage({ promptTokenCount: 17 })).toEqual({
    micros: 10,
    tokens: { input: 17, output: 0 },
  })
})

test.each([
  undefined,
  {},
  { promptTokenCount: -1 },
  { promptTokenCount: Number.NaN },
  { promptTokenCount: 0.5 },
  { candidatesTokenCount: 1120 },
  { promptTokenCount: 10, cachedContentTokenCount: 11 },
  { candidatesTokensDetails: [{ modality: "VIDEO", tokenCount: 10 }] },
])("rejects malformed usage instead of inventing a price: %j", (value) => {
  expect(() => vertexUsage(value)).toThrow("Vertex response")
})
