// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { MenuItem } from "./items"
import { MenuArea, RowMenu, RowMenuArea } from "./row"

afterEach(cleanup)

function renderRow(selectionMenu?: React.ReactNode) {
  const onRename = vi.fn()

  render(
    <MenuArea menu={<MenuItem>New table</MenuItem>}>
      <section>
        <RowMenuArea selectionMenu={selectionMenu}>
          <div>
            Leads
            <RowMenu name="Leads">
              <MenuItem onSelect={onRename}>Rename…</MenuItem>
            </RowMenu>
          </div>
        </RowMenuArea>
        Background
      </section>
    </MenuArea>
  )

  return onRename
}

test("a right-click on the row offers the items its … button does", () => {
  const onRename = renderRow()

  fireEvent.contextMenu(screen.getByText("Leads"))
  const item = screen.getByRole("menuitem", { name: "Rename…" })

  expect(item.dataset.slot).toBe("context-menu-item")
  // The row answered, so the list's background menu stays shut.
  expect(screen.queryByRole("menuitem", { name: "New table" })).toBeNull()

  fireEvent.click(item)
  expect(onRename).toHaveBeenCalledOnce()
})

test("the selection's menu stands in when the row is one of several", () => {
  renderRow(<MenuItem>Move to folder…</MenuItem>)

  fireEvent.contextMenu(screen.getByText("Leads"))

  expect(screen.getByRole("menuitem", { name: "Move to folder…" })).toBeTruthy()
  expect(screen.queryByRole("menuitem", { name: "Rename…" })).toBeNull()
})

test("a right-click on the background offers the list's own items", () => {
  renderRow()

  fireEvent.contextMenu(screen.getByText("Background"))

  expect(screen.getByRole("menuitem", { name: "New table" })).toBeTruthy()
  expect(screen.queryByRole("menuitem", { name: "Rename…" })).toBeNull()
})
