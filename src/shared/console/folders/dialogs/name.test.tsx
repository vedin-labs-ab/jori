// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { FolderNameDialog } from "./name"

afterEach(cleanup)

test("a saved folder keeps its name through close and clears on the next open", async () => {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const dialog = (isOpen: boolean) => (
    <FolderNameDialog
      initialName=""
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      submitLabel="Create folder"
      title="New folder"
    />
  )
  const { rerender } = render(dialog(true))
  const input = screen.getByLabelText("Name") as HTMLInputElement

  fireEvent.change(input, { target: { value: "Engineering plans" } })
  fireEvent.click(screen.getByRole("button", { name: "Create folder" }))

  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  expect(input.value).toBe("Engineering plans")
  expect(onSubmit).toHaveBeenCalledWith("Engineering plans")

  rerender(dialog(false))
  rerender(dialog(true))

  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("")
})
