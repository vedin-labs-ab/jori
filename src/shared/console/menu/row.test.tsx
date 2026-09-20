// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { MenuItem } from "./items"
import { MenuArea, RowMenu, RowMenuArea } from "./row"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

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

// Each target times a held touch for itself, so without the row stopping
// the press the list's menu would open over the row's.
test("a touch held on a row opens the row's menu alone", () => {
  vi.useFakeTimers()
  renderRow()

  fireEvent.pointerDown(screen.getByText("Leads"), { pointerType: "touch" })
  act(() => vi.advanceTimersByTime(800))

  expect(screen.getAllByRole("menu")).toHaveLength(1)
  expect(screen.getByRole("menuitem", { name: "Rename…" })).toBeTruthy()
})

test("a row that can be opened says so first, in both forms of its menu", () => {
  const onEnter = vi.fn()

  render(
    <RowMenuArea onEnter={onEnter}>
      <div>
        Leads
        <RowMenu name="Leads">
          <MenuItem>Rename…</MenuItem>
        </RowMenu>
      </div>
    </RowMenuArea>
  )
  fireEvent.contextMenu(screen.getByText("Leads"))

  const items = screen.getAllByRole("menuitem")

  expect(items.map((item) => item.textContent)).toEqual(["Open", "Rename…"])
  fireEvent.click(items[0] as HTMLElement)
  expect(onEnter).toHaveBeenCalledOnce()
})
