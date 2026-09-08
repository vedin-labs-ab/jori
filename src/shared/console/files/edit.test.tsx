// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { submitFrom } from "../../../../test/editor"
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

describe("edit file form submission", () => {
  test("submitting from the name field saves the edited values", () => {
    renderDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "minutes.txt" } })
    submitFrom(name)

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(file, { name: "minutes.txt" })
  })

  test("submitting stays inert while the name is empty", () => {
    renderDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "  " } })
    submitFrom(name)

    expect(onSave).not.toHaveBeenCalled()
  })
})
