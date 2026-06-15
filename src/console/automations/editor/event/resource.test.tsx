// @vitest-environment jsdom

import { type AutomationEventParameter } from "@contracts/automations/events"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { EventOptionField } from "./resource"

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
} satisfies Extract<AutomationEventParameter, { type: "option" }>

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
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

describe("automation event option field", () => {
  test("selects a loaded option", async () => {
    let selectedValue = ""
    let rerender: ReturnType<typeof render>["rerender"] | undefined
    const onValueChange = vi.fn((value: string) => {
      selectedValue = value
      rerender?.(renderEventOptionField(selectedValue, onValueChange))
    })

    rerender = render(
      renderEventOptionField(selectedValue, onValueChange)
    ).rerender

    const input = screen.getByRole("combobox", {
      name: "Channel",
    }) as HTMLInputElement

    fireEvent.click(screen.getByRole("button"))

    const option = await screen.findByRole("option", { name: /General/ })

    expect(option.className).toContain("hover:bg-accent")

    fireEvent.pointerMove(option, { pointerType: "mouse" })
    fireEvent.mouseMove(option)
    await waitFor(() => {
      expect(option.hasAttribute("data-highlighted")).toBe(true)
    })

    fireEvent.pointerDown(option, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    })
    fireEvent.mouseDown(option, { button: 0 })
    fireEvent.mouseUp(option, { button: 0 })
    fireEvent.click(option)

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("C123")
      expect(input.value).toBe("General")
    })
  })
})

describe("automation event option field in dialogs", () => {
  test("selects a portaled option inside a dialog", async () => {
    let isOpen = true
    let selectedValue = ""
    let rerender: ReturnType<typeof render>["rerender"] | undefined
    const onOpenChange = vi.fn((open: boolean) => {
      isOpen = open
      rerender?.(renderDialogEventOptionField(isOpen, selectedValue, handlers))
    })
    const onValueChange = vi.fn((value: string) => {
      selectedValue = value
      rerender?.(renderDialogEventOptionField(isOpen, selectedValue, handlers))
    })
    const handlers = { onOpenChange, onValueChange }

    rerender = render(
      renderDialogEventOptionField(isOpen, selectedValue, handlers)
    ).rerender

    fireEvent.click(screen.getByRole("button"))

    const option = await screen.findByRole("option", { name: /General/ })
    const portal = document.querySelector('[data-slot="combobox-portal"]')

    expect(portal?.className).toContain("pointer-events-auto")

    fireEvent.pointerMove(option, { pointerType: "mouse" })
    fireEvent.mouseMove(option)
    await waitFor(() => {
      expect(option.hasAttribute("data-highlighted")).toBe(true)
    })

    fireEvent.pointerDown(option, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    })
    fireEvent.mouseDown(option, { button: 0 })
    fireEvent.mouseUp(option, { button: 0 })
    fireEvent.click(option)

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("C123")
      expect(screen.getByRole("dialog")).toBeDefined()
    })
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})

function renderEventOptionField(
  value: string,
  onValueChange: (value: string) => void
) {
  return (
    <EventOptionField
      tenantId="tenant"
      integration="slack"
      parameter={channelParameter}
      criteria={{}}
      disabled={false}
      disabledMessage={undefined}
      id="automation-event-channel"
      value={value}
      onValueChange={onValueChange}
    />
  )
}

function renderDialogEventOptionField(
  isOpen: boolean,
  value: string,
  handlers: {
    onOpenChange: (isOpen: boolean) => void
    onValueChange: (value: string) => void
  }
) {
  return (
    <Dialog open={isOpen} onOpenChange={handlers.onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogTitle>Automation</DialogTitle>
        {renderEventOptionField(value, handlers.onValueChange)}
      </DialogContent>
    </Dialog>
  )
}
