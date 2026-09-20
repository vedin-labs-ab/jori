// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type FileRow } from "@/shared/console/files/types"
import { FileTitleMenu } from "./menu"

afterEach(cleanup)

const file = {
  fileId: "file-1",
  name: "costs.csv",
  visibility: { mode: "organization" },
  url: "https://files.example/costs.csv",
} as FileRow

const onOpen = vi.fn()

/** Renders the menu the detail page hands its view, opened as the shell
 *  hangs it off the file's name, led by what the view put first. */
function renderTitleMenu() {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>costs.csv</DropdownMenuTrigger>
      <FileTitleMenu
        file={file}
        isPending={false}
        lead={<div>Updated just now</div>}
        onDelete={() => undefined}
        onOpen={onOpen}
      />
    </DropdownMenu>
  )
  fireEvent.pointerDown(screen.getByRole("button", { name: "costs.csv" }), {
    button: 0,
    ctrlKey: false,
  })
}

test("leads with the view's lines, then the file's management actions, in order", () => {
  renderTitleMenu()

  expect(screen.getByText("Updated just now")).toBeDefined()
  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Rename", "Audience…", "Move to folder…", "Delete"])
})

test("leaves the links to the header the detail page already has", () => {
  renderTitleMenu()

  expect(screen.queryByRole("menuitem", { name: "Download" })).toBeNull()
  expect(screen.queryByRole("menuitem", { name: "Open in new tab" })).toBeNull()
})

test("opens the page's dialogs and confirms a delete before it happens", () => {
  renderTitleMenu()

  fireEvent.click(screen.getByRole("menuitem", { name: "Audience…" }))

  expect(onOpen).toHaveBeenCalledWith("access")
})
