// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { Table2 } from "lucide-react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { listControls } from "../../../../test/list/controls"
import { emptySelection } from "../../../../test/list/selection"
import { MaterialList } from "../materials/list"
import { EditingProvider } from "./provider"
import { useEditing } from "./state"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))
afterEach(cleanup)
const row = { id: "new", name: "New table" }

function example({
  rows,
  filtered = false,
  create = async () => ({ ...row, kind: "table" as const }),
}: {
  rows: (typeof row)[]
  filtered?: boolean
  create?: () => Promise<typeof row & { kind: "table" }>
}) {
  function Create() {
    const editing = useEditing()
    return (
      <button
        type="button"
        onClick={() => editing?.create("table", undefined, "table")}
      >
        New table
      </button>
    )
  }
  return (
    <TooltipProvider>
      <EditingProvider
        name={() => "New table"}
        onCreate={create}
        onRename={async () => null}
      >
        <Create />
        <MaterialList<typeof row>
          rows={rows}
          config={{ facets: {}, sorts: { name: (r) => r.name } }}
          controls={listControls()}
          folders={undefined}
          hasFilters={filtered}
          selection={emptySelection<typeof row>()}
          unauthorizedMessage={undefined}
          kind={{
            creationKind: "table",
            action: null,
            columns: [],
            description: "Tables",
            drag: (r) => ({ type: "table", id: r.id, name: r.name }),
            icon: Table2,
            identify: (r) => r.id,
            menu: () => null,
            nameCell: (r) => (
              <a href="#table" data-edit-key={`table:${r.id}`}>
                {r.name}
              </a>
            ),
            noun: { singular: "table", plural: "tables" },
          }}
        />
      </EditingProvider>
    </TooltipProvider>
  )
}

test("an empty filtered list still shows creation and its name input", async () => {
  render(example({ rows: [], filtered: true }))
  fireEvent.click(screen.getByRole("button", { name: "New table" }))
  const input = await screen.findByRole("textbox", { name: "Table name" })
  await waitFor(() => expect(document.activeElement).toBe(input))
  expect((input as HTMLInputElement).value).toBe("New table")
})

test("a query refresh cannot duplicate the new row or replace its typed name", async () => {
  const view = render(example({ rows: [] }))
  fireEvent.click(screen.getByRole("button", { name: "New table" }))
  const input = await screen.findByRole("textbox")
  fireEvent.change(input, { target: { value: "Customer renewals" } })
  view.rerender(example({ rows: [row] }))
  expect(screen.getByRole("textbox")).toBe(input)
  expect((input as HTMLInputElement).value).toBe("Customer renewals")
  expect(screen.queryByRole("link", { name: "New table" })).toBeNull()
  fireEvent.keyDown(input, { key: "Escape" })
  const link = screen.getByRole("link", { name: "New table" })
  await waitFor(() => expect(document.activeElement).toBe(link))
})

test("creation feedback appears while the mutation is pending", async () => {
  let finish!: (result: typeof row & { kind: "table" }) => void
  render(
    example({
      rows: [],
      create: () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    })
  )
  fireEvent.click(screen.getByRole("button", { name: "New table" }))
  expect(screen.getByRole("status").textContent).toContain("Creating table.")
  expect(screen.queryByRole("textbox")).toBeNull()
  finish({ ...row, kind: "table" })
  await screen.findByRole("textbox")
})
