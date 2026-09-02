// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type StoreDetail } from "../types"
import { StoreValue } from "./section"

afterEach(cleanup)

function renderValue(overrides: Partial<StoreDetail>) {
  const store = {
    storeId: "store-1",
    name: "Settings",
    version: 0,
    schema: undefined,
    value: undefined,
    ownerName: "Ada Lovelace",
    archivedAt: undefined,
    updatedAt: Date.now(),
    ...overrides,
  } as unknown as StoreDetail

  render(
    <TooltipProvider>
      <StoreValue
        onWriteSchema={() => Promise.resolve()}
        onWriteValue={() => Promise.resolve()}
        store={store}
      />
    </TooltipProvider>
  )
}

test("a schemaless store offers a schema instead of a JSON field", () => {
  renderValue({})

  expect(screen.queryByLabelText("Store value JSON")).toBeNull()
  expect(screen.getByText("No schema yet")).toBeDefined()

  // The empty state's call to action carries a label; the toolbar's
  // schema button next to it is icon-only.
  fireEvent.click(screen.getByText("Add schema"))

  expect(screen.getByRole("dialog")).toBeDefined()
})

test("a schemaless store that was written reads as a document", () => {
  renderValue({ value: { free: "form" }, version: 3 })

  expect(screen.queryByLabelText("Store value JSON")).toBeNull()
  expect(screen.getByText('"form"')).toBeDefined()
})
