// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { type StoreDetail } from "../types"
import { StoreSchemaDialog } from "./dialog"

const writeSchema = vi.fn()

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => writeSchema,
}))

afterEach(cleanup)

beforeEach(() => {
  writeSchema.mockReset()
  writeSchema.mockResolvedValue({})
})

const schemaStore = {
  storeId: "store-1",
  name: "Settings",
  schema: {
    type: "object",
    properties: { total: { type: "string" } },
    required: ["total"],
  },
} as unknown as StoreDetail

const bareStore = {
  storeId: "store-1",
  name: "Settings",
  schema: undefined,
} as unknown as StoreDetail

function renderDialog(store: StoreDetail, onOpenChange = () => undefined) {
  render(
    <StoreSchemaDialog
      onOpenChange={onOpenChange}
      organizationId="org-1"
      store={store}
    />
  )
}

// Radix tabs select on mousedown, not click.
function switchTab(name: "Code" | "Form") {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 })
}

describe("seeding from the store", () => {
  test("an existing schema loads into the form view", () => {
    renderDialog(schemaStore)

    const nameInput = screen.getByLabelText("Field name") as HTMLInputElement

    expect(screen.getByText("Schema", { selector: "h2" })).toBeDefined()
    expect(nameInput.value).toBe("total")
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true")
  })

  test("a schema the form cannot hold opens as code with a note", () => {
    renderDialog({
      ...schemaStore,
      schema: { type: "object", additionalProperties: false },
    } as StoreDetail)

    const textarea = screen.getByRole("textbox", {
      name: "Schema",
    }) as HTMLTextAreaElement

    expect(JSON.parse(textarea.value)).toEqual({
      type: "object",
      additionalProperties: false,
    })
    expect(screen.getByText(/features the form view cannot edit/)).toBeDefined()
  })

  test("a store without a schema opens the add flow", () => {
    renderDialog(bareStore)

    expect(screen.getByText("Add schema", { selector: "h2" })).toBeDefined()
    expect(screen.queryByRole("button", { name: "Remove schema" })).toBeNull()
  })
})

describe("saving the schema", () => {
  test("submits the schema the form builds", async () => {
    renderDialog(bareStore)
    fireEvent.click(screen.getByRole("button", { name: "Add field" }))
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "total" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save schema" }))

    await waitFor(() => expect(writeSchema).toHaveBeenCalledOnce())
    expect(writeSchema.mock.calls[0]?.[0]).toEqual({
      organizationId: "org-1",
      storeId: "store-1",
      schema: { type: "object", properties: { total: { type: "string" } } },
    })
  })

  test("code-view errors block the save inline", () => {
    renderDialog(bareStore)
    switchTab("Code")
    fireEvent.change(screen.getByLabelText("Schema"), {
      target: { value: '{ "type": "string" }' },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save schema" }))

    expect(
      screen.getByText("Store schema must describe a JSON object.")
    ).toBeDefined()
    expect(writeSchema).not.toHaveBeenCalled()
  })

  test("a backend refusal attaches under the editor", async () => {
    writeSchema.mockRejectedValue(
      new Error("The current value does not satisfy this schema")
    )
    renderDialog(schemaStore)
    fireEvent.click(screen.getByRole("button", { name: "Save schema" }))

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "current value does not satisfy"
      )
    })
  })
})

describe("removing the schema", () => {
  test("sends null and closes on success", async () => {
    const onOpenChange = vi.fn()

    renderDialog(schemaStore, onOpenChange)
    fireEvent.click(screen.getByRole("button", { name: "Remove schema" }))

    await waitFor(() => expect(writeSchema).toHaveBeenCalledOnce())
    expect(writeSchema.mock.calls[0]?.[0]).toEqual({
      organizationId: "org-1",
      storeId: "store-1",
      schema: null,
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
