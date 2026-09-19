// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Infrastructure } from "./infrastructure"

afterEach(cleanup)

test("scopes the residency claim to Jori storage", () => {
  const { container } = render(<Infrastructure />)

  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
    "Stored in your region"
  )
  expect(container.textContent).toContain("Choose an EU or US workspace.")
  expect(container.textContent).toContain(
    "stores your chats, files and workspace records in your chosen region."
  )
  expect(container.textContent).toContain(
    "Separate applications, databases and file storage in the EU and US."
  )
  expect(container.textContent).not.toContain("everything else stays")
  expect(screen.queryByRole("link", { name: "Polar" })).toBeNull()
})

test("states the approved exception in the list, not behind a helper", () => {
  const { container } = render(<Infrastructure />)

  expect(container.textContent).toContain(
    "Page fetching and billing use global services that may process data outside your chosen region."
  )
  expect(screen.queryByRole("button")).toBeNull()
})
