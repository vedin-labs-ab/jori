// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import {
  type Editing,
  EditingContext,
  useEditMenuFocus,
} from "../../edit/state"

afterEach(cleanup)
test("menu dismissal yields focus to an inline edit, but restores it when idle", () => {
  const value: Editing = {
    edit: undefined,
    begin: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    close: vi.fn(),
    register: vi.fn(),
    claim: vi.fn(),
  }
  const { result, rerender } = renderHook(useEditMenuFocus, {
    wrapper: ({ children }) => (
      <EditingContext value={value}>{children}</EditingContext>
    ),
  })
  const idle = new Event("closeAutoFocus", { cancelable: true })
  result.current(idle)
  expect(idle.defaultPrevented).toBe(false)
  value.edit = {
    item: { id: "new", kind: "folder", name: "New folder" },
    surface: "sidebar",
  }
  rerender()
  const editing = new Event("closeAutoFocus", { cancelable: true })
  result.current(editing)
  expect(editing.defaultPrevented).toBe(true)
})
