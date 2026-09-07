import { expect, test } from "vitest"
import { isContextOverflow } from "./overflow"

test("reads a context overflow off the provider's status, body, or message", () => {
  expect(
    isContextOverflow(
      Object.assign(new Error("Bad Request"), {
        body: '{"error":{"code":400,"message":"This endpoint\'s maximum context length is 128000 tokens. However, you requested about 131000 tokens."}}',
        statusCode: 400,
      })
    )
  ).toBe(true)
  expect(
    isContextOverflow(
      Object.assign(new Error("Payload Too Large"), { statusCode: 413 })
    )
  ).toBe(true)
  expect(
    isContextOverflow(
      Object.assign(new Error("Bad Request"), {
        body: '{"error":{"code":400,"message":"Prompt too long","metadata":{"type":"context_length_exceeded"}}}',
        statusCode: 400,
      })
    )
  ).toBe(true)
  expect(
    isContextOverflow(new Error("prompt is too long: 200000 tokens"))
  ).toBe(true)
})

test("other failures are left for the retry policy", () => {
  expect(
    isContextOverflow(
      Object.assign(new Error("Provider overloaded"), { statusCode: 502 })
    )
  ).toBe(false)
  expect(isContextOverflow(new Error("Rate limit exceeded"))).toBe(false)
  expect(isContextOverflow("context length")).toBe(false)
  expect(isContextOverflow(null)).toBe(false)
})
