// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { AddRowDialog } from "./add"
import { type TableRow } from "./types"

afterEach(cleanup)

test("retains the saved row through close and starts the next row empty", async () => {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn().mockResolvedValue("new-row" as TableRow["rowId"])
  const dialog = (isOpen: boolean) => (
    <AddRowDialog
      columns={[{ id: "title", name: "Title", type: "string", required: true }]}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  )
  const view = render(dialog(true))
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Regional customer review" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Add row" }))
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
    "Regional customer review"
  )

  view.rerender(dialog(false))
  view.rerender(dialog(true))
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("")
})
