// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { ConsolePageBoundary } from "./boundary"

let fails = true
let message = "Column `owner` is missing"

afterEach(() => {
  cleanup()
  fails = true
  message = "Column `owner` is missing"
})

/** The boundary around a page that throws on data it did not expect, until
 *  `fails` is cleared. */
function renderPage(pathname: string) {
  function Page() {
    if (fails) {
      throw new Error(message)
    }

    return <>Table content</>
  }

  return render(
    <ConsolePageBoundary pathname={pathname}>
      <Page />
    </ConsolePageBoundary>
  )
}

test("clears the failure on navigation, without a reload", () => {
  const view = renderPage("/tables")

  expect(screen.getByText("This page didn't load")).toBeDefined()

  // The pathname is the reset key. Picking another destination in the
  // sidebar has to render that page, not hold the previous one's error.
  view.rerender(
    <ConsolePageBoundary pathname="/runs">Runs content</ConsolePageBoundary>
  )

  expect(screen.queryByText("This page didn't load")).toBeNull()
  expect(screen.getByText("Runs content")).toBeDefined()
})

test("retries the same page in place", () => {
  renderPage("/tables")

  fails = false
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))

  expect(screen.getByText("Table content")).toBeDefined()
})

test("offers a reload when the tab is running an older build", () => {
  // A deploy replaced the chunk this tab asks for. Retrying re-runs the same
  // dead import, so the only honest action left is a reload.
  message = "Failed to fetch dynamically imported module: /assets/tables.js"
  renderPage("/tables")

  expect(screen.getByRole("button", { name: "Reload" })).toBeDefined()
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
})
