// @vitest-environment jsdom
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type MouseEvent } from "react"
import { createPortal } from "react-dom"
import { afterEach, expect, test, vi } from "vitest"
import { TableBody, TableCell } from "@/components/ui/table"
import { emptySelection } from "../../../../../test/list/selection"
import { type Editing, EditingContext } from "../../edit/state"
import { dragActivationDistance, emptyPayload } from "../../folders/drag/plan"
import { useResourceRowDrag } from "../../folders/drag/state"
import { ListRow } from "./row"

const row = { id: "leads" }

afterEach(() => {
  cleanup()

  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  }
})

function renderRow(editing?: Editing, isSelected = false) {
  const handlers = {
    onDragStart: vi.fn(),
    onMenu: vi.fn(),
    onOpen: vi.fn((event: MouseEvent) => event.preventDefault()),
    onSecondary: vi.fn((event: MouseEvent) => event.preventDefault()),
    selection: {
      ...emptySelection<typeof row>(),
      identify: (picked: typeof row) => picked.id,
      isSelected: () => isSelected,
      pick: vi.fn(),
      pickId: vi.fn(),
    },
  }

  render(
    <EditingContext value={editing}>{tableFixture(handlers)}</EditingContext>
  )

  return handlers
}

type Handlers = ReturnType<typeof renderRow>

function tableFixture(handlers: Handlers) {
  const Row = rowFixture(handlers)

  function DragTable() {
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: { distance: dragActivationDistance },
      })
    )

    return (
      <DndContext onDragStart={handlers.onDragStart} sensors={sensors}>
        <table>
          <TableBody>
            <Row />
            <tr data-row-id="next" tabIndex={-1}>
              <td>Next row</td>
            </tr>
          </TableBody>
        </table>
      </DndContext>
    )
  }

  return <DragTable />
}

function rowFixture({ onMenu, onOpen, onSecondary, selection }: Handlers) {
  return function TestRow() {
    const drag = useResourceRowDrag(
      { type: "table", id: "leads", name: "Leads" },
      emptyPayload
    )

    return (
      <ListRow drag={drag} row={row} selection={selection}>
        <TableCell>
          <input aria-label="Select Leads" type="checkbox" />
        </TableCell>
        <TableCell data-row-link>
          {/* Opens as the router's link does: unless the click was claimed. */}
          <a
            draggable={false}
            href="/tables/leads"
            onClick={(event) => (event.defaultPrevented ? null : onOpen(event))}
          >
            <span>Leads</span>
          </a>
        </TableCell>
        <TableCell>
          <span>Ada Lovelace</span>
        </TableCell>
        <TableCell>
          <a href="/folders/sales" onClick={onSecondary}>
            Sales
          </a>
        </TableCell>
        <TableCell>
          <button onClick={onMenu} type="button">
            <span>Actions</span>
          </button>
          <input aria-label="Note" />
          {createPortal(
            <button onClick={onMenu} type="button">
              Portaled action
            </button>,
            document.body
          )}
        </TableCell>
      </ListRow>
    )
  }
}

test("a click picks the row from its name, a plain cell, or its whitespace", () => {
  const { onOpen, selection } = renderRow()
  const owner = screen.getByText("Ada Lovelace")

  fireEvent.click(owner, { detail: 1 })
  fireEvent.click(owner.parentElement as HTMLElement, { detail: 1 })
  fireEvent.click(screen.getByText("Leads"), { detail: 1 })

  expect(selection.pick.mock.calls).toEqual([
    [row, "alone"],
    [row, "alone"],
    [row, "alone"],
  ])
  expect(onOpen).not.toHaveBeenCalled()
})

test("⌘ or Ctrl toggles the row and Shift runs from the last pick", () => {
  const { selection } = renderRow()
  const owner = screen.getByText("Ada Lovelace")

  fireEvent.click(owner, { detail: 1, metaKey: true })
  fireEvent.click(owner, { ctrlKey: true, detail: 1 })
  fireEvent.click(screen.getByText("Leads"), { detail: 1, shiftKey: true })

  expect(selection.pick.mock.calls.map(([, how]) => how)).toEqual([
    "toggle",
    "toggle",
    "range",
  ])
})

test("a double-click opens the row, and so do the keyboard and a touch", () => {
  const { onOpen, selection } = renderRow()

  fireEvent.doubleClick(screen.getByText("Ada Lovelace"))
  expect(onOpen).toHaveBeenCalledOnce()

  // Enter on the focused link clicks it with no pointer click count.
  fireEvent.click(screen.getByText("Leads"), { detail: 0 })
  expect(onOpen).toHaveBeenCalledTimes(2)

  const tap = new MouseEvent("click", { bubbles: true, detail: 1 })
  Object.defineProperty(tap, "pointerType", { value: "touch" })
  fireEvent(screen.getByText("Ada Lovelace"), tap)
  expect(onOpen).toHaveBeenCalledTimes(3)
  expect(selection.pick).not.toHaveBeenCalled()
})

test("a right-click picks an unselected row and leaves a selected one alone", () => {
  const first = renderRow()

  fireEvent.contextMenu(screen.getByText("Ada Lovelace"))
  expect(first.selection.pick).toHaveBeenCalledWith(row)
  cleanup()

  const second = renderRow(undefined, true)

  fireEvent.contextMenu(screen.getByText("Ada Lovelace"))
  expect(second.selection.pick).not.toHaveBeenCalled()
})

test("secondary links, selection, editable fields and menus keep their actions", () => {
  const { onMenu, onOpen, onSecondary, selection } = renderRow()
  const checkbox = screen.getByRole("checkbox") as HTMLInputElement

  fireEvent.click(checkbox, { detail: 1 })
  fireEvent.click(screen.getByRole("textbox"), { detail: 1 })
  fireEvent.click(screen.getByText("Actions"), { detail: 1 })
  fireEvent.click(screen.getByText("Portaled action"), { detail: 1 })
  fireEvent.click(screen.getByRole("link", { name: "Sales" }), { detail: 1 })
  fireEvent.doubleClick(screen.getByText("Actions"))

  expect(checkbox.checked).toBe(true)
  expect(onMenu).toHaveBeenCalledTimes(2)
  expect(onSecondary).toHaveBeenCalledOnce()
  expect(onOpen).not.toHaveBeenCalled()
  expect(selection.pick).not.toHaveBeenCalled()
})

function startDrag(target: Element) {
  fireEvent.pointerDown(target, {
    button: 0,
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    pointerId: 1,
  })
  fireEvent.pointerMove(document, {
    clientX: dragActivationDistance + 1,
    clientY: 0,
    pointerId: 1,
  })
}

test("a drag starts from the name and picks its row, and releasing it neither opens nor picks again", () => {
  vi.useFakeTimers()
  const { onDragStart, onOpen, selection } = renderRow()

  startDrag(screen.getByText("Leads"))
  expect(onDragStart).toHaveBeenCalledOnce()
  // Started outside the selection, the drag carries this row alone, so it
  // becomes the selection: what is lit is what is moving.
  expect(selection.pick).toHaveBeenCalledExactlyOnceWith(row)
  fireEvent.pointerUp(document, { pointerId: 1 })
  // dnd-kit temporarily blocks document clicks; the row must still
  // reject a trailing click after those listeners have been removed.
  act(() => vi.advanceTimersByTime(50))
  fireEvent.click(screen.getByText("Leads"), { detail: 1 })
  expect(onOpen).not.toHaveBeenCalled()
  expect(selection.pick).toHaveBeenCalledOnce()

  // A later deliberate click picks the row again.
  fireEvent.pointerDown(screen.getByText("Leads"), { button: 0 })
  fireEvent.click(screen.getByText("Leads"), { detail: 1 })
  expect(selection.pick).toHaveBeenCalledTimes(2)
})

test("a drag from inside the selection leaves the selection as it is", () => {
  vi.useFakeTimers()
  const { onDragStart, selection } = renderRow(undefined, true)

  startDrag(screen.getByText("Leads"))

  expect(onDragStart).toHaveBeenCalledOnce()
  expect(selection.pick).not.toHaveBeenCalled()
  fireEvent.pointerUp(document, { pointerId: 1 })
  // Let the drag's guard against a trailing click run out.
  act(() => vi.advanceTimersByTime(50))
})

// Everything but the name is left for the marquee and the row's controls.
test.each([
  "Ada Lovelace",
  "Select Leads",
  "Sales",
  "Actions",
  "Note",
  "Portaled action",
])("a pointer move on %s does not drag the row", (name) => {
  const { onDragStart } = renderRow()
  const target = screen.queryByLabelText(name) ?? screen.getByText(name)

  startDrag(target)

  expect(onDragStart).not.toHaveBeenCalled()
})

// Pausing drag must leave the row's form controls available to assistive tech.
test("inline editing suspends dragging without disabling the row's controls", () => {
  const { onDragStart } = renderRow({
    edit: {
      item: { id: "new", kind: "folder", name: "New folder" },
      surface: "contents",
    },
    begin: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    close: vi.fn(),
    register: vi.fn(),
    claim: vi.fn(),
  })
  startDrag(screen.getByText("Leads"))
  expect(onDragStart).not.toHaveBeenCalled()
  expect(
    screen.getByRole("textbox").closest('[aria-disabled="true"]')
  ).toBeNull()
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Contracts" },
  })
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
    "Contracts"
  )
})

test("a focused row opens on Enter and toggles on Space", () => {
  const { onOpen, selection } = renderRow()
  const leads = screen.getAllByRole("row")[0] as HTMLElement

  fireEvent.keyDown(leads, { key: "Enter" })
  expect(onOpen).toHaveBeenCalledOnce()

  fireEvent.keyDown(leads, { key: " " })
  expect(selection.pickId).toHaveBeenCalledWith("leads", "toggle")
})

test("the arrows move focus to the next row and pick it, running the range with Shift", () => {
  const { selection } = renderRow()
  const [leads, next] = screen.getAllByRole("row") as HTMLElement[]

  fireEvent.keyDown(leads as HTMLElement, { key: "ArrowDown" })
  expect(document.activeElement).toBe(next)
  expect(selection.pickId).toHaveBeenLastCalledWith("next", "alone")

  // From the name link too, where Tab lands a keyboard user.
  fireEvent.keyDown(screen.getByText("Leads"), {
    key: "ArrowDown",
    shiftKey: true,
  })
  expect(selection.pickId).toHaveBeenLastCalledWith("next", "range")
})

test("a row's own controls keep their keys", () => {
  const { onOpen, selection } = renderRow()

  fireEvent.keyDown(screen.getByRole("checkbox"), { key: " " })
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
  fireEvent.keyDown(screen.getByText("Actions"), { key: "ArrowDown" })

  expect(onOpen).not.toHaveBeenCalled()
  expect(selection.pickId).not.toHaveBeenCalled()
})
