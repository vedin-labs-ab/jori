// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { ActivityTokenUsage } from "."

afterEach(() => {
  cleanup()
})

test("omits zero-value token usage metrics", () => {
  render(
    <ActivityTokenUsage
      usage={{
        input: 8000,
        output: 37,
        reasoning: 0,
        total: 8037,
      }}
    />
  )

  expect(screen.getByText("in 8K · out 37 · total 8K")).toBeDefined()
  expect(screen.queryByText(/reasoning 0/)).toBeNull()
})

test("renders nothing when every token usage metric is zero", () => {
  const { container } = render(
    <ActivityTokenUsage
      usage={{
        input: 0,
        output: 0,
        reasoning: 0,
        total: 0,
      }}
    />
  )

  expect(container.textContent).toBe("")
})
