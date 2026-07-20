// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { OrganizationSearchableTableHead } from "./table"

afterEach(cleanup)

test("opens, focuses, updates, and clears a searchable table header", () => {
  render(<SearchableHeader />)

  fireEvent.click(screen.getByRole("button", { name: "Search member" }))

  const input = screen.getByRole("searchbox", { name: "Search members" })
  expect(document.activeElement).toBe(input)

  fireEvent.change(input, { target: { value: "Ada" } })
  expect((input as HTMLInputElement).value).toBe("Ada")

  fireEvent.click(
    screen.getByRole("button", { name: "Clear member search" })
  )

  const trigger = screen.getByRole("button", { name: "Search member" })
  expect(screen.queryByRole("searchbox")).toBeNull()
  expect(document.activeElement).toBe(trigger)

  fireEvent.click(trigger)
  expect(
    (screen.getByRole("searchbox", {
      name: "Search members"
    }) as HTMLInputElement).value
  ).toBe("")
})

test("Escape clears and closes a searchable table header", () => {
  const onKeyDown = vi.fn()
  render(
    <div onKeyDown={onKeyDown}>
      <SearchableHeader />
    </div>
  )

  fireEvent.click(screen.getByRole("button", { name: "Search member" }))
  const input = screen.getByRole("searchbox", { name: "Search members" })
  fireEvent.change(input, { target: { value: "Ada" } })
  fireEvent.keyDown(input, { key: "Escape" })

  expect(onKeyDown).not.toHaveBeenCalled()
  expect(screen.queryByRole("searchbox")).toBeNull()
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Search member" })
  )
})

function SearchableHeader() {
  const [value, setValue] = useState("")

  return (
    <table>
      <thead>
        <tr>
          <OrganizationSearchableTableHead
            label="Member"
            onValueChange={setValue}
            placeholder="Search members"
            value={value}
          />
        </tr>
      </thead>
    </table>
  )
}
