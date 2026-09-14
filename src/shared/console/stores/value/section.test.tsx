// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type ReactNode, useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "../../materials/breadcrumb"
import { type StoreDetail } from "../types"
import { StoreValue } from "./section"

// Load real lazy views before interaction assertions start their deadlines.
import "../../mirror/view"

afterEach(cleanup)

const plainSchema = {
  type: "object",
  properties: { title: { type: "string" } },
  required: ["title"],
}

function renderValue(overrides: Partial<StoreDetail>) {
  /** Stands in for the console header: the published name as the menu's
   *  trigger, with the published menu and suffix beside it. */
  function Header({ children }: { children: ReactNode }) {
    const [crumb, setCrumb] = useState<MaterialBreadcrumb>()

    return (
      <MaterialBreadcrumbContext.Provider value={setCrumb}>
        <DropdownMenu>
          <DropdownMenuTrigger>{crumb?.name}</DropdownMenuTrigger>
          {crumb?.menu}
        </DropdownMenu>
        {children}
      </MaterialBreadcrumbContext.Provider>
    )
  }

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
      <Header>
        <StoreValue
          onWriteSchema={() => Promise.resolve()}
          onWriteValue={() => Promise.resolve()}
          store={store}
          titleMenu={(lead) => (
            <DropdownMenuContent>
              {lead}
              <div>Rename…</div>
            </DropdownMenuContent>
          )}
        />
      </Header>
    </TooltipProvider>
  )
}

/** Opens the menu on the store's name. Radix opens on pointer down and
 *  hides the rest of the page from assistive tech while it is open, so
 *  the trigger is looked up once. */
function openMenu() {
  const trigger = screen.getByRole("button", { name: "Settings" })

  fireEvent.pointerDown(trigger)
  fireEvent.click(trigger)
}

test("a schemaless store offers a schema instead of a JSON field", () => {
  renderValue({})

  expect(screen.getByText("No schema yet")).toBeDefined()
  expect(screen.queryByRole("textbox")).toBeNull()

  fireEvent.click(screen.getByText("Add schema"))

  expect(screen.getByRole("dialog")).toBeDefined()
})

test("a schemaless store that was written reads as a document", () => {
  renderValue({ value: { free: "form" }, version: 3 })

  expect(screen.getByText('"form"')).toBeDefined()
})

test("the title menu leads with provenance, then the store's own tools", () => {
  renderValue({ value: { free: "form" }, version: 3 })

  openMenu()

  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  expect(screen.getByText(/· v3$/)).toBeDefined()
  expect(screen.queryByRole("menuitemradio")).toBeNull()
  expect(screen.getByRole("menuitem", { name: "Add schema…" })).toBeDefined()
  expect(screen.getByRole("menuitem", { name: "Copy value" })).toBeDefined()
  expect(screen.getByText("Rename…")).toBeDefined()
})

test("a store with a form offers the view in the menu and copies its value", async () => {
  const writeText = vi.fn(() => Promise.resolve())

  Object.assign(navigator, { clipboard: { writeText } })
  renderValue({ schema: plainSchema, value: { title: "Hello" }, version: 1 })

  openMenu()

  expect(
    screen.getByRole("menuitemradio", { name: "Form" }).dataset.state
  ).toBe("checked")
  expect(screen.getByRole("menuitem", { name: "Schema…" })).toBeDefined()

  fireEvent.click(screen.getByRole("menuitem", { name: "Copy value" }))

  await vi.waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ title: "Hello" }, null, 2)
    )
  )
})
