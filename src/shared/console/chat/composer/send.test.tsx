// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { mentionSources, renderComposer } from "../../../../../test/composer"
import { typeInto } from "../../../../../test/editor"

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

test("Enter sends the trimmed text and clears the field; Shift+Enter keeps writing", async () => {
  const { field, onSend } = await renderComposer()

  expect(
    screen
      .getByRole("button", { name: "Send message" })
      .hasAttribute("disabled")
  ).toBe(true)

  typeInto(field, "  Chase the invoices ")
  fireEvent.keyDown(field, { key: "Enter", shiftKey: true })

  expect(onSend).not.toHaveBeenCalled()

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledWith("Chase the invoices", [])
  expect(field.textContent).toBe("")
})

test("a send the host is still answering holds the draft, then clears it", async () => {
  let land: () => void = () => undefined
  const onSend = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        land = resolve
      })
  )
  const { field } = await renderComposer({ onSend })

  typeInto(field, "Chase the invoices")
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledTimes(1)
  expect(field.textContent).toBe("Chase the invoices")
  expect(field.getAttribute("aria-disabled")).toBe("true")
  expect(screen.queryByRole("button", { name: "Send message" })).toBeNull()
  expect(screen.getByRole("status", { name: "Sending" })).toBeDefined()

  // A second Enter waits with the first.
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledTimes(1)

  land()

  await waitFor(() => expect(field.textContent).toBe(""))
  await waitFor(() => expect(field.getAttribute("aria-disabled")).toBeNull())
  expect(screen.getByRole("button", { name: "Send message" })).toBeDefined()
})

test("a send that fails leaves the draft where it was", async () => {
  const onSend = vi.fn(() => Promise.reject(new Error("Offline")))
  const { field } = await renderComposer({ onSend })

  typeInto(field, "Chase +[job:jobs_digest] now")
  fireEvent.keyDown(field, { key: "Enter" })

  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send message" })).toBeDefined()
  )
  expect(field.textContent).toContain("Chase")
  expect(
    screen.getByRole("button", { name: "Remove Renewals digest" })
  ).toBeDefined()
  expect(field.getAttribute("aria-disabled")).toBeNull()

  // The words go again on the next try.
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).toHaveBeenCalledTimes(2)
  expect(onSend).toHaveBeenLastCalledWith("Chase +[job:jobs_digest] now", [
    { kind: "job", id: "jobs_digest" },
  ])
})

test("shortcut controls name their band and remember visibility after remounting", async () => {
  const { field } = await renderComposer()

  typeInto(field, "Keep this draft")

  const band = screen.getByRole("button", { name: "Hide shortcuts" })
  const bandId = band.getAttribute("aria-controls")

  expect(bandId).not.toBeNull()
  expect(document.getElementById(bandId ?? "")).not.toBeNull()

  fireEvent.click(band)

  expect(screen.queryByRole("button", { name: "Hide shortcuts" })).toBeNull()
  // The closing band stays mounted for its animation, but is inactive.
  expect(band.isConnected).toBe(true)
  expect(band.hasAttribute("disabled")).toBe(true)
  expect(band.closest("[inert]")).not.toBeNull()
  const peek = screen.getByRole("button", { name: "Show shortcuts" })
  expect(
    screen
      .getByRole("button", { name: "Show shortcuts" })
      .getAttribute("aria-controls")
  ).toBe(bandId)

  fireEvent.click(peek)

  expect(band.hasAttribute("disabled")).toBe(false)
  expect(peek.isConnected).toBe(true)
  expect(peek.hasAttribute("disabled")).toBe(true)
  expect(peek.closest("[inert]")).not.toBeNull()
  expect(field.textContent).toBe("Keep this draft")

  fireEvent.click(band)

  cleanup()
  await renderComposer()

  expect(screen.queryByRole("button", { name: "Hide shortcuts" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Show shortcuts" }))

  expect(screen.getByRole("button", { name: "Hide shortcuts" })).toBeDefined()

  cleanup()
  await renderComposer()

  expect(screen.getByRole("button", { name: "Hide shortcuts" })).toBeDefined()
  expect(screen.queryByRole("button", { name: "Show shortcuts" })).toBeNull()
})

test("while a run is live the control stops it instead of sending", async () => {
  const onStop = vi.fn()
  const { field, onSend } = await renderComposer({ isLive: true, onStop })

  expect(screen.queryByRole("button", { name: "Send message" })).toBeNull()

  typeInto(field, "Also this")
  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Stop run" }))

  expect(onStop).toHaveBeenCalledTimes(1)
})

test("disabled, it says why", async () => {
  const { field } = await renderComposer({
    disabled: true,
    reason: "Spending is paused for this folder.",
  })

  expect(field.getAttribute("aria-disabled")).toBe("true")
  expect(field.getAttribute("contenteditable")).toBe("false")
  expect(screen.getByText("Spending is paused for this folder.")).toBeDefined()
  expect(field.getAttribute("aria-describedby")).not.toBeNull()
  expect(
    screen.queryByRole("button", { name: "Mention a resource" })
  ).toBeNull()
})

test("a click on the frame beside the controls puts the caret in the field", async () => {
  const { field } = await renderComposer()

  field.blur()
  expect(document.activeElement).not.toBe(field)

  const controls = document.querySelector("[data-slot=input-group-addon]")

  if (controls === null) {
    throw new Error("The controls row is missing.")
  }

  fireEvent.click(controls)

  // The editor takes focus on the next frame.
  await waitFor(() => expect(document.activeElement).toBe(field))
})

test("Enter waits while the host is still looking for what a + names", async () => {
  const { field, onSend } = await renderComposer({
    mentions: { ...mentionSources, resources: [], searching: true },
  })

  typeInto(field, "Open +rel")

  expect((await screen.findByRole("status")).textContent).toBe("Looking…")

  fireEvent.keyDown(field, { key: "Enter" })

  expect(onSend).not.toHaveBeenCalled()
})
