// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { InstructionSuggestions } from "./suggestions"

afterEach(cleanup)

test("uses provider logos and a full-width muted footer", () => {
  render(
    <InstructionSuggestions
      listboxId="tool-suggestions"
      onActiveIndexChange={vi.fn()}
      onSelect={vi.fn()}
      state={{
        active: { end: 1, kind: "tool", query: "", start: 0 },
        activeIndex: 0,
        empty: "empty",
        range: { from: 0, to: 1 },
        style: {},
        suggestions: [
          {
            access: { kind: "builtIn" },
            disabled: false,
            id: "save_file",
            kind: "tool",
            label: "save_file",
            surface: "jori",
          },
          {
            access: { integration: "slack", kind: "integration" },
            disabled: false,
            id: "conversations_add_message",
            kind: "tool",
            label: "conversations_add_message",
            surface: "slack",
          },
        ],
      }}
    />
  )

  const listbox = screen.getByRole("listbox")
  const shell = listbox.parentElement?.parentElement
  const footer = screen.getByText(
    "Selecting a tool can add the access it needs."
  )
  const builtIn = screen.getByRole("option", { name: "save_file" })
  const needsAccess = screen.getByRole("option", {
    name: "conversations_add_message",
  })

  expect(shell?.classList).toContain("w-72")
  expect(shell?.classList).toContain("max-w-[calc(100%-0.5rem)]")
  expect(shell?.classList).not.toContain("p-1")
  expect(listbox.parentElement?.classList).toContain("p-1")
  expect(footer.parentElement).toBe(shell)
  expect(listbox.contains(footer)).toBe(false)
  expect(footer.classList).toContain("border-t")
  expect(footer.classList).toContain("bg-muted/30")
  expect(builtIn.getAttribute("aria-describedby")).toBeNull()
  expect(needsAccess.getAttribute("aria-describedby")).toBe(footer.id)
  expectProviderLogos(builtIn, needsAccess)
  expect(screen.queryByText("Built in")).toBeNull()
  expect(screen.queryByText("+ Slack access")).toBeNull()
})

function expectProviderLogos(builtIn: HTMLElement, needsAccess: HTMLElement) {
  expect(builtIn.querySelector("svg")?.getAttribute("viewBox")).toBe(
    "6 6 52 52"
  )
  expect(needsAccess.querySelector("img")?.getAttribute("src")).toBe(
    "/logos/integrations/slack.svg"
  )
}
