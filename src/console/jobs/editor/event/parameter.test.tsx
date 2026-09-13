// @vitest-environment jsdom

import { type JobEventParameter } from "@contracts/jobs/events"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { EventParameterControl } from "./parameter"

const convexMocks = vi.hoisted(() => ({
  useAction: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useAction: convexMocks.useAction,
}))

const channelParameter = {
  type: "option",
  key: "channel",
  label: "Channel",
  placeholder: "Search channels",
  required: true,
  source: "slack.channels",
} satisfies Extract<JobEventParameter, { type: "option" }>

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
  })

  convexMocks.useAction.mockReturnValue(
    vi.fn().mockResolvedValue({
      status: "ready",
      options: [
        {
          label: "General",
          value: "C123",
          description: "Main channel",
        },
      ],
    })
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test("selects a loaded option inside a dialog without dismissing it", async () => {
  const onOpenChange = vi.fn()
  const onValueChange = vi.fn()

  renderDialog(onOpenChange, onValueChange)

  fireEvent.click(screen.getByRole("button"))

  const option = await screen.findByRole("option", { name: /General/ })
  const portal = document.querySelector('[data-slot="combobox-portal"]')
  expect(portal?.className).toContain("pointer-events-auto")

  fireEvent.pointerDown(option, {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
  fireEvent.click(option)

  await waitFor(() => {
    expect(onValueChange).toHaveBeenCalledWith("C123")
    expect(
      (screen.getByRole("combobox", { name: "Channel" }) as HTMLInputElement)
        .value
    ).toBe("General")
  })
  expect(screen.getByRole("dialog")).toBeDefined()
  expect(onOpenChange).not.toHaveBeenCalledWith(false)

  fireEvent.click(screen.getByRole("button", { name: "Clear Channel" }))
  await waitFor(() => {
    expect(onValueChange).toHaveBeenLastCalledWith("")
    expect(
      (screen.getByRole("combobox", { name: "Channel" }) as HTMLInputElement)
        .value
    ).toBe("")
  })
})

function renderDialog(
  onOpenChange: (open: boolean) => void,
  onValueChange: (value: string) => void
) {
  function Fixture() {
    const [open, setOpen] = useState(true)
    const [value, setValue] = useState("")

    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          onOpenChange(next)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>Job</DialogTitle>
          <EventParameterControl
            organizationId="organization"
            parameter={channelParameter}
            parameters={[channelParameter]}
            values={{ channel: value }}
            id="job-event-channel"
            onValueChange={(next) => {
              setValue(next)
              onValueChange(next)
            }}
          />
        </DialogContent>
      </Dialog>
    )
  }

  render(<Fixture />)
}
