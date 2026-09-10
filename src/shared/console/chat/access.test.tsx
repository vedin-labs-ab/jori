// @vitest-environment jsdom
import { type Visibility } from "@contracts/visibility"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { VisibilityDialog } from "../visibility/dialog"
import { VisibilityField } from "../visibility/field"
import { chatVisibilityHelp } from "./access"

afterEach(cleanup)

test("chat sharing keeps extra guidance in field help and saves the chosen audience", async () => {
  const save = vi.fn()

  renderSharing(save)
  expect(screen.queryByText(chatVisibilityHelp)).toBeNull()
  fireEvent.focus(screen.getByRole("button", { name: "Visibility help" }))
  expect((await screen.findByRole("tooltip")).textContent).toContain(
    chatVisibilityHelp
  )
  fireEvent.blur(screen.getByRole("button", { name: "Visibility help" }))

  fireEvent.click(screen.getByRole("combobox", { name: "Visibility" }))
  fireEvent.click(
    screen.getByRole("option", { name: "Everyone in the organization" })
  )

  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Save" }))
  expect(save).toHaveBeenCalledWith({ mode: "organization" })
})

function renderSharing(onSave: (value: Visibility) => void) {
  function SharingDialog() {
    const [value, setValue] = useState<Visibility>({ mode: "private" })

    return (
      <VisibilityDialog
        audience={null}
        canEdit
        field={
          <VisibilityField
            help={chatVisibilityHelp}
            id="chat-visibility"
            noun="chat"
            onChange={setValue}
            options={{ people: undefined, teams: undefined }}
            value={value}
          />
        }
        isSaving={false}
        noun="chat"
        onOpenChange={() => undefined}
        onSave={() => onSave(value)}
        open
      />
    )
  }

  render(<SharingDialog />)
}
