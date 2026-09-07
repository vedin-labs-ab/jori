// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ChatContextUsage } from "../types"
import { ContextIndicator } from "."

afterEach(cleanup)

test("the ring names the share and the tokens, and opens the last turn's receipt", () => {
  render(indicator({ usedTokens: 61_000 }))

  const trigger = screen.getByRole("button", {
    name: "Context: 31%, 61K of 200K tokens",
  })

  expect(trigger.textContent).toContain("31%")
  expect(trigger.className).toContain("text-muted-foreground")

  fireEvent.click(trigger)

  expect(screen.getByText("Last turn")).toBeDefined()
  expect(screen.getAllByText("31%")).toHaveLength(2)
  expect(row("Input")).toBe("61K")
  expect(row("Output")).toBe("900")
  expect(row("Reasoning")).toBe("300")
  expect(row("Cached")).toBe("40K")
  expect(row("Cost")).toBe("$0.33")
})

test("the tone warms at 70% and turns to the destructive color at 85%", () => {
  const { rerender } = render(indicator({ usedTokens: 140_000 }))

  expect(screen.getByRole("button").className).toContain("text-amber-600")

  rerender(indicator({ usedTokens: 170_000 }))

  expect(screen.getByRole("button").className).toContain("text-destructive")
})

test("before a turn completes the receipt says so", () => {
  render(indicator({ turn: null, usedTokens: 0 }))

  fireEvent.click(screen.getByRole("button", { name: /Context: 0%/ }))

  expect(screen.getByText("No turn has completed yet.")).toBeDefined()
  expect(screen.queryByText("Last turn")).toBeNull()
})

function indicator({
  turn = { cached: 40_000, input: 61_000, output: 900, reasoning: 300 },
  usedTokens,
}: {
  turn?: ChatContextUsage["turn"]
  usedTokens: number
}) {
  return (
    <TooltipProvider>
      <ContextIndicator
        usage={{
          condensed: false,
          model: "openai/gpt-5.6-sol",
          runId: "runs_1",
          turn,
          usedTokens,
          windowTokens: 200_000,
        }}
      />
    </TooltipProvider>
  )
}

function row(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent
}
