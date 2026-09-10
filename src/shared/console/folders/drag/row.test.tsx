// @vitest-environment jsdom
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type MouseEvent } from "react"
import { createPortal } from "react-dom"
import { afterEach, expect, test, vi } from "vitest"
import { TableBody, TableCell } from "@/components/ui/table"
import { dragActivationDistance, emptyPayload } from "./plan"
import { DraggableTableRow } from "./row"
import { useResourceRowDrag } from "./state"

afterEach(() => {
  cleanup()

  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  }
})

function renderRow() {
  const handlers = {
    onDragStart: vi.fn(),
    onMenu: vi.fn(),
    onOpen: vi.fn((event: MouseEvent) => event.preventDefault()),
    onSecondary: vi.fn((event: MouseEvent) => event.preventDefault()),
  }

  render(tableFixture(handlers))

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
          </TableBody>
        </table>
      </DndContext>
    )
  }

  return <DragTable />
}

function rowFixture({ onMenu, onOpen, onSecondary }: Handlers) {
  return function TestRow() {
    const drag = useResourceRowDrag(
      { type: "table", id: "leads", name: "Leads" },
      emptyPayload
    )

    return (
      <DraggableTableRow drag={drag}>
        <TableCell>
          <input aria-label="Select Leads" type="checkbox" />
        </TableCell>
        <TableCell data-row-link>
          <a draggable={false} href="/tables/leads" onClick={onOpen}>
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
      </DraggableTableRow>
    )
  }
}

test("clicking other cells or row whitespace opens its name link once", () => {
  const { onOpen } = renderRow()
  const owner = screen.getByText("Ada Lovelace")

  fireEvent.click(owner)
  fireEvent.click(owner.parentElement as HTMLElement)
  fireEvent.click(screen.getByRole("row"))

  expect(onOpen).toHaveBeenCalledTimes(3)

  fireEvent.click(screen.getByText("Leads"))
  expect(onOpen).toHaveBeenCalledTimes(4)
})

test("row clicks preserve modifiers on the existing link", () => {
  const { onOpen } = renderRow()

  fireEvent.click(screen.getByText("Ada Lovelace"), { metaKey: true })
  fireEvent.click(screen.getByRole("row"), { ctrlKey: true, shiftKey: true })

  expect(onOpen.mock.calls[0]?.[0].metaKey).toBe(true)
  expect(onOpen.mock.calls[1]?.[0].ctrlKey).toBe(true)
  expect(onOpen.mock.calls[1]?.[0].shiftKey).toBe(true)
})

test("secondary links, selection, editable fields and menus keep their actions", () => {
  const { onMenu, onOpen, onSecondary } = renderRow()
  const checkbox = screen.getByRole("checkbox") as HTMLInputElement

  fireEvent.click(checkbox)
  fireEvent.click(screen.getByRole("textbox"))
  fireEvent.click(screen.getByText("Actions"))
  fireEvent.click(screen.getByText("Portaled action"))
  fireEvent.click(screen.getByRole("link", { name: "Sales" }))

  expect(checkbox.checked).toBe(true)
  expect(onMenu).toHaveBeenCalledTimes(2)
  expect(onSecondary).toHaveBeenCalledOnce()
  expect(onOpen).not.toHaveBeenCalled()
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

test.each([
  "Leads",
  "Ada Lovelace",
])("a drag can start from %s, and releasing it does not open the row", (name) => {
  vi.useFakeTimers()
  const { onDragStart, onOpen } = renderRow()

  startDrag(screen.getByText(name))
  expect(onDragStart).toHaveBeenCalledOnce()
  fireEvent.pointerUp(document, { pointerId: 1 })
  // dnd-kit temporarily blocks document clicks; the row must still
  // reject a trailing click after those listeners have been removed.
  act(() => vi.advanceTimersByTime(50))
  fireEvent.click(screen.getByText(name), { detail: 1 })
  expect(onOpen).not.toHaveBeenCalled()

  // Enter-generated clicks have no pointer click count, and still open
  // a link after a drag without requiring another pointer interaction.
  fireEvent.click(screen.getByText("Leads"), { detail: 0 })
  expect(onOpen).toHaveBeenCalledOnce()

  // A later deliberate click still opens the row.
  fireEvent.pointerDown(screen.getByText(name), { button: 0 })
  fireEvent.click(screen.getByText(name))
  expect(onOpen).toHaveBeenCalledTimes(2)
})

test.each([
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
