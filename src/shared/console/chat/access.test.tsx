// @vitest-environment jsdom
import { type Visibility } from "@contracts/visibility"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { VisibilityDialog } from "../visibility/dialog"
import { VisibilityField } from "../visibility/field"
import { ChatVisibilityNotice } from "./access"

afterEach(cleanup)

test("sharing explains participation and the context change before saving", () => {
  const save = vi.fn()

  renderSharing(save)
  expect(screen.getByText(/Jori uses your personal connections/)).toBeDefined()
  expect(screen.queryByText(/stops any running work/)).toBeNull()

  fireEvent.click(screen.getByRole("combobox", { name: "Visibility" }))
  fireEvent.click(
    screen.getByRole("option", { name: "Everyone in the organization" })
  )

  expect(screen.getByText(/read the full history and activity/)).toBeDefined()
  expect(screen.getByText(/stops any running work/)).toBeDefined()
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
            id="chat-visibility"
            noun="chat"
            onChange={setValue}
            options={{ people: undefined, teams: undefined }}
            value={value}
          />
        }
        isSaving={false}
        noun="chat"
        notice={
          <ChatVisibilityNotice current={{ mode: "private" }} value={value} />
        }
        onOpenChange={() => undefined}
        onSave={() => onSave(value)}
        open
      />
    )
  }

  render(<SharingDialog />)
}
