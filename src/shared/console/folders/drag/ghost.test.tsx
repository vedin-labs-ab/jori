// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { DragGhost } from "./ghost"

afterEach(cleanup)

const payload = {
  folders: [{ folderId: "ops", name: "Operations" }],
  resources: [
    { type: "table" as const, id: "leads", name: "Leads" },
    { type: "file" as const, id: "report", name: "report.pdf" },
    { type: "job" as const, id: "digest", name: "Digest" },
  ],
}

test("one row shows one card and no count", () => {
  render(
    <DragGhost payload={{ folders: [], resources: [payload.resources[0]] }} />
  )

  expect(screen.getByText("Leads")).toBeDefined()
  expect(screen.queryByText(/^\+/)).toBeNull()
  expect(document.querySelectorAll("[data-ghost=behind]")).toHaveLength(0)
})

test("a pile fronts the first row, counts the rest, and fans two behind", () => {
  const { container } = render(<DragGhost payload={payload} />)
  expect(screen.getByText("Operations")).toBeDefined()
  expect(screen.getByText("+3")).toBeDefined()

  const behind = [...container.querySelectorAll("[data-ghost=behind]")]

  // Decorative: hidden from assistive tech, two at most.
  expect(
    behind.every((card) => card.getAttribute("aria-hidden") === "true")
  ).toBe(true)

  expect(behind.map((card) => card.textContent)).toEqual([
    "report.pdf",
    "Leads",
  ])
  expect(screen.queryByText("Digest")).toBeNull()
})
