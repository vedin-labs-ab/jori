// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { MaterialFolderCell } from "./cells/folder"
import {
  type FolderNames,
  folderFacet,
  folderHint,
  folderPath,
} from "./folders"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))
afterEach(cleanup)

const folders: FolderNames = new Map([
  ["finance", { name: "Finance" }],
  ["success", { name: "Customer success" }],
  ["billing-renewals", { name: "Renewals", parentId: "finance" }],
  ["success-renewals", { name: "Renewals", parentId: "success" }],
  ["billing-review", { name: "Review", parentId: "billing-renewals" }],
  ["success-review", { name: "Review", parentId: "success-renewals" }],
])

test("row links and folder filters disambiguate duplicate parents with the same full path", () => {
  render(<MaterialFolderCell folderId="billing-review" folders={folders} />)
  const link = screen.getByRole("link", { name: "Finance / Renewals / Review" })
  expect(link.getAttribute("href")).toBe("/folders/billing-review")
  expect(link.getAttribute("title")).toContain("Finance / Renewals / Review")
  expect(
    folderFacet(folders).options.find(
      (option) => option.value === "billing-review"
    )?.hint
  ).toBe("Finance / Renewals")
  expect(folderHint(folders, "finance")).toBeUndefined()
  expect(folderHint(folders, "success-review")).toBe(
    "Customer success / Renewals"
  )
})

test("unfiled, loading, and unavailable locations remain distinguishable", () => {
  const { rerender } = render(
    <MaterialFolderCell folderId={undefined} folders={folders} />
  )
  expect(screen.getByText("Unfiled")).toBeDefined()
  expect(folderFacet(folders).options[0].label).toBe("Unfiled")
  rerender(<MaterialFolderCell folderId="missing" folders={undefined} />)
  expect(screen.queryByText("Unfiled")).toBeNull()
  expect(screen.queryByText("Unavailable folder")).toBeNull()
  rerender(<MaterialFolderCell folderId="missing" folders={folders} />)
  expect(screen.getByText("Unavailable folder")).toBeDefined()
  expect(screen.queryByRole("link")).toBeNull()
})

test("broken or cyclic ancestry never looks like a complete root path", () => {
  const incomplete: FolderNames = new Map([
    ["child", { name: "Renewals", parentId: "missing" }],
    ["cycle", { name: "Loop", parentId: "cycle" }],
  ])
  expect(folderPath(incomplete, "child")).toBe("Unavailable folder / Renewals")
  expect(folderPath(incomplete, "cycle")).toBe("Unavailable folder / Loop")
})
