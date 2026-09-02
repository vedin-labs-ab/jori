// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { FolderUsageHint } from "./hint"

const { spend } = vi.hoisted(() => ({
  spend: { current: undefined as { micros: number } | undefined },
}))

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

vi.mock("convex/react", () => ({ useQuery: () => spend.current }))

afterEach(cleanup)

function renderHint(micros: number | undefined, folderId?: string) {
  spend.current = micros === undefined ? undefined : { micros }

  render(
    <FolderUsageHint
      folderId={folderId as never}
      organizationId="organization"
    />
  )
}

test("a folder's spend opens that folder's own usage page", () => {
  renderHint(12_400_000, "folders:1")

  const link = screen.getByRole("link", {
    name: "Usage: $12.40 in the last 30 days",
  })

  expect(link.getAttribute("href")).toBe("/folders/folders:1/usage")
  // The visible text stays terse; the accessible name says what it means.
  expect(screen.getByText("$12.40 · 30 days")).toBeDefined()
})

test("without a folder the hint is the whole tree's spend", () => {
  renderHint(0)

  expect(
    screen
      .getByRole("link", { name: "Usage: $0.00 in the last 30 days" })
      .getAttribute("href")
  ).toBe("/folders/usage")
})

test("a figure still loading is no figure at all", () => {
  renderHint(undefined, "folders:1")

  // A hint that appeared a beat after the crumb would shift the header
  // under the reader; it waits instead.
  expect(screen.queryByRole("link")).toBeNull()
})
