// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { Table2 } from "lucide-react"
import { afterEach, expect, test } from "vitest"
import { MaterialNameCell, materialNameLinkClassName } from "./name"

afterEach(cleanup)

// The hardest case for CSS truncation: no spaces, so nothing can wrap.
const longName = "Screen-Recording-2026-06-08-at-13.18.03".repeat(4)

test("caps the cell and lets the name link truncate", () => {
  render(
    <MaterialNameCell description={longName} icon={Table2}>
      <a className={materialNameLinkClassName} href="/somewhere">
        {longName}
      </a>
    </MaterialNameCell>
  )

  const link = screen.getByRole("link", { name: longName })
  expect(link.className).toContain("truncate")

  // The width cap must sit on the inner block, not the table cell: browsers
  // ignore max-width on cells when sizing auto-layout table columns.
  const cell = link.closest(".max-w-64")
  expect(cell).not.toBeNull()
  expect(cell?.className).toContain("grid")

  // The flex row must be allowed to shrink inside the capped grid, or the
  // name pushes the row wide instead of ellipsizing.
  expect(link.parentElement?.className).toContain("min-w-0")
  expect(link.parentElement?.className).toContain("flex")

  const description = screen.getByTitle(longName)
  expect(description.className).toContain("truncate")
})

test("omits the description subline when there is none", () => {
  render(
    <MaterialNameCell icon={Table2}>
      <a className={materialNameLinkClassName} href="/somewhere">
        Notes
      </a>
    </MaterialNameCell>
  )

  const link = screen.getByRole("link", { name: "Notes" })
  expect(link.closest(".max-w-64")?.querySelector("p")).toBeNull()
})
