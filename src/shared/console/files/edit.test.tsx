// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { EditFileDialog } from "./edit"
import { type FileRow } from "./types"

const onSave = vi.fn()
const file = { name: "notes.txt" } as FileRow

afterEach(cleanup)

beforeEach(() => onSave.mockReset())

function renderDialog() {
  render(
    <EditFileDialog
      file={file}
      isSaving={false}
      onOpenChange={() => undefined}
      onSave={onSave}
    />
  )
}

/** jsdom leaves out the browser's implicit Enter-to-submit, so pressing
 *  Enter in a field is modeled by submitting the form it belongs to. */
function pressEnter(field: HTMLElement) {
  const form = field.closest("form")

  if (form === null) {
    throw new Error("The field is not inside a form.")
  }

  fireEvent.submit(form)
}

describe("edit file enter submission", () => {
  test("Enter in the name field saves the edited values", () => {
    renderDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "minutes.txt" } })
    pressEnter(name)

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(file, { name: "minutes.txt" })
  })

  test("Enter stays inert while the name is empty", () => {
    renderDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "  " } })
    pressEnter(name)

    expect(onSave).not.toHaveBeenCalled()
  })
})
