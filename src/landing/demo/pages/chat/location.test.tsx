// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"
import { typeInto } from "../../../../../test/editor"
import { folderId } from "../../fixtures/folders"
import { renewalsTableId } from "../../fixtures/materials/tables"
import "./index"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))
afterEach(cleanup)

test("Ask Jori inserts the table inline, suggests its folder, and saves a private chat elsewhere", async () => {
  render(<DemoConsoleAt path={`/tables/${renewalsTableId}`} />)
  fireEvent.click(await screen.findByText("Ask Jori", { exact: true }))
  const field = await screen.findByRole("textbox", { name: "Message" })
  const mention = await screen.findByRole("button", {
    name: "Remove Customer renewals",
  })
  expect(field.contains(mention)).toBe(true)
  fireEvent.click(screen.getByRole("button", { name: "Save in: Renewals" }))
  fireEvent.change(
    await screen.findByRole("textbox", { name: "Search folders" }),
    { target: { value: "Engineering" } }
  )
  fireEvent.click(screen.getByRole("button", { name: "Engineering" }))
  expect(field.contains(mention)).toBe(true)
  typeInto(field, "needs attention")
  fireEvent.keyDown(field, { key: "Enter" })
  expect(
    await screen.findByRole("button", { name: "Saved in: Engineering" })
  ).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Audience: Only me" }))
  expect(await screen.findByRole("dialog", { name: "Audience" })).toBeDefined()
  expect(screen.getByText("Visible only to you.")).toBeDefined()
})

test("a folder entry can be cleared and sends without an extra resource badge", async () => {
  render(<DemoConsoleAt path={`/folders/${folderId("renewals")}`} />)
  fireEvent.click(await screen.findByText("Ask Jori", { exact: true }))
  const field = await screen.findByRole("textbox", { name: "Message" })
  expect(field.textContent).toBe("")
  fireEvent.click(screen.getByRole("button", { name: "Remove folder" }))
  typeInto(field, "A question outside the folder")
  fireEvent.keyDown(field, { key: "Enter" })
  expect(
    await screen.findByRole("button", { name: "Choose folder" })
  ).toBeDefined()
  expect(
    screen.getByRole("button", { name: "Audience: Only me" })
  ).toBeDefined()
})
