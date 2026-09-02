// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type FileRow } from "@/shared/console/files/types"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "@/shared/console/materials/breadcrumb"
import { FileTitleMenu } from "./title"

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }))
// The actions and the dialogs they open are the list page's, already
// covered there; this is about what the breadcrumb offers.
vi.mock("./manage", () => ({
  toMoveTarget: () => undefined,
  useFileActions: () => ({
    deleteFile: vi.fn(),
    pendingFileId: undefined,
    saveFile: vi.fn(),
  }),
}))
vi.mock("@/shared/console/files/edit", () => ({ EditFileDialog: () => null }))
vi.mock("../folders/move", () => ({ MoveResourceDialog: () => null }))
vi.mock("../shared/visibility/dialog", () => ({
  VisibilityDialog: () => null,
}))

afterEach(cleanup)

const file = {
  fileId: "file-1",
  name: "costs.csv",
  visibility: { mode: "organization" },
  url: "https://files.example/costs.csv",
} as FileRow

/** Renders the menu the detail page publishes, opened as the shell hangs
 *  it off the file's name. */
function renderTitleMenu() {
  let published: MaterialBreadcrumb | undefined

  render(
    <MaterialBreadcrumbContext value={(material) => (published = material)}>
      <FileTitleMenu file={file} organizationId="org-1" />
    </MaterialBreadcrumbContext>
  )

  // Unmounting withdraws the crumb, so hold it before the page goes.
  const crumb = published

  cleanup()
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>costs.csv</DropdownMenuTrigger>
      {crumb?.menu}
    </DropdownMenu>
  )
  fireEvent.pointerDown(screen.getByRole("button", { name: "costs.csv" }), {
    button: 0,
    ctrlKey: false,
  })

  return crumb
}

test("publishes the file's name for the breadcrumb", () => {
  expect(renderTitleMenu()?.name).toBe("costs.csv")
})

test("offers the file's management actions, in order", () => {
  renderTitleMenu()

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Edit details", "Sharing…", "Move to folder…", "Delete"])
})

test("leaves the links to the header the detail page already has", () => {
  renderTitleMenu()

  expect(screen.queryByRole("menuitem", { name: "Download" })).toBeNull()
  expect(screen.queryByRole("menuitem", { name: "Open" })).toBeNull()
})
