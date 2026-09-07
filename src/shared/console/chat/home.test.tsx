// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ChatHome } from "./home"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

const now = 1_700_000_000_000

test("offers the suggestions and lists the recent conversations by time", () => {
  const onSuggestion = vi.fn()

  render(
    <ChatHome
      composer={<p>Composer</p>}
      now={now}
      onSuggestion={onSuggestion}
      recent={[
        {
          id: "conversations_renewals",
          title: "Renewals at risk",
          updatedAt: now - 3_600_000,
        },
        {
          id: "conversations_flaky",
          title: "Flaky payroll test",
          updatedAt: now - 86_400_000 * 2,
        },
      ]}
      suggestions={["Which renewals are at risk?", "Summarize #finance"]}
    />
  )

  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
    "What needs doing?"
  )
  expect(screen.getByText("Composer")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Summarize #finance" }))

  expect(onSuggestion).toHaveBeenCalledWith("Summarize #finance")

  const link = screen.getByRole("link", { name: /Renewals at risk/ })

  expect(link.getAttribute("href")).toBe("/chat/conversations_renewals")
  expect(link.textContent).toContain("1h ago")
  expect(
    screen.getByRole("link", { name: /Flaky payroll test/ }).textContent
  ).toContain("2d ago")
})

test("without conversations there is no recent section at all", () => {
  render(
    <ChatHome
      composer={null}
      now={now}
      onSuggestion={vi.fn()}
      recent={[]}
      suggestions={[]}
    />
  )

  expect(screen.queryByText("Recent")).toBeNull()
  expect(screen.queryByText(/No conversations/)).toBeNull()
  expect(screen.queryByRole("region")).toBeNull()
})
