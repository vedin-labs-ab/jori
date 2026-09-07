// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { History, Mail } from "lucide-react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ConsoleNavigationContext } from "../shell/location"
import { ChatHome } from "./home"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

// The command list scrolls its chosen row into view, which jsdom lacks.
beforeEach(() => {
  Object.assign(HTMLElement.prototype, { scrollIntoView: () => undefined })
})

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
      suggestions={[
        { icon: History, text: "Which renewals are at risk?" },
        { icon: Mail, text: "Summarize #finance" },
      ]}
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
  expect(screen.queryByText(/See all/)).toBeNull()
})

test("four chats show; the rest are a search away", () => {
  const navigate = vi.fn()
  const recent = ["a", "b", "c", "d", "e", "f"].map((id, index) => ({
    id: `conversations_${id}`,
    title: `Chat ${id}`,
    updatedAt: now - index * 1_000,
  }))

  render(
    <ConsoleNavigationContext.Provider value={{ navigate, pathname: "/chat" }}>
      <ChatHome
        composer={null}
        now={now}
        onSuggestion={vi.fn()}
        recent={recent}
        suggestions={[]}
      />
    </ConsoleNavigationContext.Provider>
  )

  expect(screen.getAllByRole("link")).toHaveLength(4)
  expect(screen.queryByRole("link", { name: /Chat e/ })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "See all 6 chats" }))
  fireEvent.click(screen.getByRole("option", { name: "Chat f" }))

  expect(navigate).toHaveBeenCalledWith("/chat/conversations_f")
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
