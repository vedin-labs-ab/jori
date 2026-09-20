// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../../../../convex/_generated/api"
import { FolderUsage } from "./view"

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }))

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

vi.mock("convex/react", () => ({ useQuery, useAction: () => vi.fn() }))

afterEach(() => {
  cleanup()
  useQuery.mockReset()
})

function renderUsage(folderId?: string) {
  render(
    <FolderUsage
      days={7}
      folderId={folderId as never}
      onDaysChange={() => undefined}
      organizationId="organization"
    />
  )

  return useQuery.mock.calls[0]
}

test("a folder's usage is the overview of that folder's subtree", () => {
  expect(renderUsage("folders:1")).toEqual([
    api.folders.usage.overview,
    { organizationId: "organization", days: 7, folderId: "folders:1" },
  ])
  expect(useQuery).toHaveBeenCalledTimes(1)
})

test("without a folder the whole tree is asked for, and no folder is named", () => {
  // Named as absent rather than undefined: the query's argument validator
  // takes the folder as optional, not as a key holding nothing.
  expect(renderUsage()?.[1]).toStrictEqual({
    organizationId: "organization",
    days: 7,
  })
})
