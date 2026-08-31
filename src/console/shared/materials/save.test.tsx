// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { SaveMeta, type SaveState } from "./save"

afterEach(() => {
  cleanup()
})

const updatedAt = Date.parse("2026-01-15T10:00:00Z")

function renderMeta(saveStatus?: SaveState) {
  return render(<SaveMeta saveStatus={saveStatus} updatedAt={updatedAt} />)
}

test("a read-only view carries freshness and no save affordance", () => {
  const { container } = renderMeta()

  expect(screen.getByText(/^Updated/)).toBeDefined()
  expect(container.querySelector("[aria-live]")).toBeNull()
})

test("a save in flight shimmers the label", () => {
  renderMeta("saving")

  expect(screen.getByText(/^Updated/).className).toContain("shimmer")
})

test("a failed save does not shimmer, because nothing is progressing", () => {
  renderMeta("error")

  expect(screen.getByText(/^Updated/).className).not.toContain("shimmer")
})

test("a failed save says so in words rather than only in a tooltip", () => {
  renderMeta("error")

  expect(screen.getByText("Not saved")).toBeDefined()
})

test("a failed save interrupts, a landed one waits its turn", () => {
  const { container: failed } = renderMeta("error")

  const alert = failed.querySelector("[aria-live]")

  expect(alert?.getAttribute("aria-live")).toBe("assertive")
  expect(alert?.textContent).toBe("Couldn't save. Retrying.")

  cleanup()

  const { container: saved } = renderMeta("saved")
  const status = saved.querySelector("[aria-live]")

  expect(status?.getAttribute("aria-live")).toBe("polite")
  expect(status?.textContent).toBe("Saved")
})

test("an idle editor announces nothing and collapses its slot", () => {
  const { container } = renderMeta("idle")

  expect(container.querySelector("[aria-live]")?.textContent).toBe("")
  expect(container.querySelector("[aria-hidden]")?.className).toContain(
    "max-w-0"
  )
})
