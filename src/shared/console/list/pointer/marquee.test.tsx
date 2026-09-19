// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { emptySelection } from "../../../../../test/list/selection"
import { ConsoleListTable } from "../frame"

afterEach(cleanup)

/** jsdom lays nothing out, so each row is given the 40px band it would
 *  take under a list that starts at the viewport's top. */
function renderList(selected: string[] = []) {
  const selection = {
    ...emptySelection<string>(),
    replace: vi.fn(),
    selected,
  }

  render(
    <ConsoleListTable selection={selection}>
      <TableBody>
        {["a", "b", "c"].map((id) => (
          <TableRow data-row-id={id} key={id}>
            <TableCell>Row {id}</TableCell>
            <TableCell data-row-link>
              <a href={`/${id}`}>Name {id}</a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ConsoleListTable>
  )

  for (const [index, row] of screen.getAllByRole("row").entries()) {
    row.getBoundingClientRect = () =>
      new DOMRect(0, index * 40, 600, 40) as DOMRect
  }

  const list = screen.getByRole("table").parentElement
    ?.parentElement as HTMLElement
  list.getBoundingClientRect = () => new DOMRect(0, 0, 600, 400) as DOMRect

  return selection
}

function sweep(from: Element, to: { x: number; y: number }, init = {}) {
  fireEvent.pointerDown(from, { button: 0, clientX: 300, clientY: 10, ...init })
  fireEvent.pointerMove(window, { clientX: to.x, clientY: to.y })
}

const lastSwept = (selection: ReturnType<typeof renderList>) =>
  [...(selection.replace.mock.lastCall?.[0] ?? [])].sort()

test("a drag from a plain cell selects every row the box touches", () => {
  const selection = renderList()

  sweep(screen.getByText("Row a"), { x: 350, y: 50 })
  expect(lastSwept(selection)).toEqual(["a", "b"])

  fireEvent.pointerMove(window, { clientX: 350, clientY: 100 })
  expect(lastSwept(selection)).toEqual(["a", "b", "c"])
})

test("⌘ adds the sweep to what was already selected", () => {
  const selection = renderList(["c"])

  sweep(screen.getByText("Row a"), { x: 350, y: 20 }, { metaKey: true })

  expect(lastSwept(selection)).toEqual(["a", "c"])
})

test("the name is left to drag the row, so no sweep starts there", () => {
  const selection = renderList()

  sweep(screen.getByText("Name a"), { x: 350, y: 100 })

  expect(selection.replace).not.toHaveBeenCalled()
})

test("a click on the background clears the selection", () => {
  const selection = renderList(["a"])
  const list = screen.getByRole("table").parentElement
    ?.parentElement as HTMLElement

  fireEvent.pointerDown(list, { button: 0, clientX: 300, clientY: 300 })
  fireEvent.pointerUp(window)

  expect(selection.replace).toHaveBeenCalledWith([])
})
