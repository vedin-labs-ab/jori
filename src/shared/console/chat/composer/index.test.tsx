// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ChatComposer } from "."

afterEach(cleanup)

test("Enter sends the trimmed text and clears the field; Shift+Enter keeps writing", () => {
  const onSend = vi.fn()

  render(<ChatComposer live={null} onSend={onSend} onStop={vi.fn()} />)

  const field = screen.getByRole("textbox", { name: "Message" })

  expect(
    screen
      .getByRole("button", { name: "Send message" })
      .hasAttribute("disabled")
  ).toBe(true)

  fireEvent.change(field, { target: { value: "  Chase the invoices " } })
  fireEvent.keyDown(field, { key: "Enter", shiftKey: true })

  expect(onSend).not.toHaveBeenCalled()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledWith("Chase the invoices")
  expect((field as HTMLTextAreaElement).value).toBe("")
})

test("while a run is live the control stops it instead of sending", () => {
  const onSend = vi.fn()
  const onStop = vi.fn()

  render(
    <ChatComposer
      live={{ id: "runs_1", status: "running" }}
      onSend={onSend}
      onStop={onStop}
    />
  )

  expect(screen.queryByRole("button", { name: "Send message" })).toBeNull()

  const field = screen.getByRole("textbox", { name: "Message" })

  fireEvent.change(field, { target: { value: "Also this" } })
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Stop run" }))

  expect(onStop).toHaveBeenCalledTimes(1)
})

test("disabled, it says why", () => {
  render(
    <ChatComposer
      disabled
      live={null}
      onSend={vi.fn()}
      onStop={vi.fn()}
      reason="Spending is paused for this folder."
    />
  )

  const field = screen.getByRole("textbox", { name: "Message" })

  expect(field.hasAttribute("disabled")).toBe(true)
  expect(screen.getByText("Spending is paused for this folder.")).toBeDefined()
  expect(field.getAttribute("aria-describedby")).not.toBeNull()
})

test("the context chip names the resource and can be dropped", () => {
  const onClearContext = vi.fn()

  render(
    <ChatComposer
      context={{ kind: "folder", id: "folders_finance", name: "Finance" }}
      live={null}
      onClearContext={onClearContext}
      onSend={vi.fn()}
      onStop={vi.fn()}
    />
  )

  expect(screen.getByText("Finance")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Remove Finance" }))

  expect(onClearContext).toHaveBeenCalledTimes(1)
})
