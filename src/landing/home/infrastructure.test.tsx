// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Infrastructure } from "./infrastructure"

afterEach(cleanup)

test("scopes the residency claim to Jori storage", () => {
  const { container } = render(<Infrastructure />)

  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
    "Region-specific data residency"
  )
  expect(container.textContent).toContain(
    "Choose an EU or US workspace. Jori stores your chats, files and workspace records in your chosen region."
  )
  expect(container.textContent).toContain(
    "Separate applications, databases and file storage in the EU and US."
  )
  expect(container.textContent).not.toContain("everything else stays")
  expect(screen.queryByRole("link", { name: "Stripe" })).toBeNull()
  expect(screen.queryByRole("tooltip")).toBeNull()
})

test("exposes the approved exception text through the suffix helper", async () => {
  render(<Infrastructure />)
  const helper = screen.getByRole("button", {
    name: "Data residency scope and exceptions",
  })

  expect(helper.closest("p")?.textContent).toContain(
    "workspace records in your chosen region."
  )
  fireEvent.focus(helper)

  expect((await screen.findByRole("tooltip")).textContent).toBe(
    "Some features use services that process data outside your chosen region, including web search, code execution and billing."
  )

  fireEvent.keyDown(helper, { key: "Escape" })
  await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull())
})
