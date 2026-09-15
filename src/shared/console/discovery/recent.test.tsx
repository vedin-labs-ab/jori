// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { SearchPalette } from "./palette"

afterEach(cleanup)

test("recent chats use the same rounded icon as chat search results", () => {
  render(
    <SearchPalette
      open
      onOpenChange={vi.fn()}
      onOpenHit={vi.fn()}
      onNavigate={vi.fn()}
      onQueryChange={vi.fn()}
      onRetry={vi.fn()}
      query=""
      chats={[
        {
          id: "chat-1",
          title: "Renewals",
          visibility: { mode: "private" },
          updatedAt: 1,
        },
      ]}
      state={{ status: "idle", hits: [], partial: false }}
    />
  )
  const recent = screen.getByRole("group", { name: "Recent" })
  expect(recent.querySelector("svg.lucide-message-circle")).toBeTruthy()
})
