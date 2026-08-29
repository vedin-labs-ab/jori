// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { CreateStoreDialog } from "./create"
import { fieldNameErrors } from "./schema/model"

const createStore = vi.fn()

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => createStore,
}))

afterEach(cleanup)

beforeEach(() => {
  createStore.mockReset()
  createStore.mockResolvedValue({})
})

function renderDialog() {
  render(
    <CreateStoreDialog
      isOpen
      onOpenChange={() => undefined}
      organizationId="org-1"
    />
  )
}

function addField() {
  fireEvent.click(screen.getByRole("button", { name: "Add field" }))
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create store" }))
}

// Radix tabs select on mousedown, not click.
function switchTab(name: "Code" | "Form") {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 })
}

/** jsdom leaves out the browser's implicit Enter-to-submit, so pressing
 *  Enter in a field is modeled by submitting the form it belongs to. */
function pressEnter(field: HTMLElement) {
  const form = field.closest("form")

  if (form === null) {
    throw new Error("The field is not inside a form.")
  }

  fireEvent.submit(form)
}

describe("create store enter submission", () => {
  test("Enter in the name field runs validation before any mutation", () => {
    renderDialog()
    pressEnter(screen.getByLabelText("Name"))

    expect(screen.getByRole("alert").textContent).toBe("Name is required.")
    expect(createStore).not.toHaveBeenCalled()
  })

  test("Enter in a filled name field creates the store", async () => {
    renderDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "Invoices" } })
    pressEnter(name)

    await waitFor(() => expect(createStore).toHaveBeenCalledOnce())
    expect(createStore.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      name: "Invoices",
    })
  })
})

describe("create store error visibility", () => {
  test("no errors show before a submit attempt", () => {
    renderDialog()
    addField()

    expect(screen.queryByRole("alert")).toBeNull()
  })

  test("submit surfaces name and field errors, and edits clear them", () => {
    renderDialog()
    addField()
    submit()

    const alerts = screen
      .getAllByRole("alert")
      .map((alert) => alert.textContent)

    expect(alerts).toEqual(["Name is required.", fieldNameErrors.missing])
    expect(createStore).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoices" },
    })
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "total" },
    })

    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("create store code errors", () => {
  test("code-view errors appear on submit and clear when the JSON changes", () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoices" },
    })
    switchTab("Code")
    fireEvent.change(screen.getByLabelText("Schema"), {
      target: { value: '{ "type": "string" }' },
    })
    submit()

    expect(
      screen.getByText("Store schema must describe a JSON object.")
    ).toBeDefined()

    fireEvent.change(screen.getByLabelText("Schema"), {
      target: { value: '{ "type": "object" }' },
    })

    expect(screen.queryByRole("alert")).toBeNull()
  })

  test("backend schema errors attach under the schema editor", async () => {
    createStore.mockRejectedValue(
      new Error("Store schema.properties.total: uses unsupported type date")
    )
    renderDialog()
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoices" },
    })
    submit()

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "uses unsupported type date"
      )
    })
  })
})

describe("create store submission", () => {
  test("the form view builds the schema the mutation receives", async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoices" },
    })
    addField()
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "total" },
    })
    fireEvent.click(screen.getByRole("switch"))
    submit()

    await waitFor(() => expect(createStore).toHaveBeenCalledOnce())
    expect(createStore.mock.calls[0]?.[0]).toMatchObject({
      name: "Invoices",
      schema: {
        type: "object",
        properties: { total: { type: "string" } },
        required: ["total"],
      },
    })
  })
})

describe("create store form to code", () => {
  test("switching to code shows the emitted schema", () => {
    renderDialog()
    addField()
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "total" },
    })
    switchTab("Code")

    const textarea = screen.getByLabelText("Schema") as HTMLTextAreaElement

    expect(JSON.parse(textarea.value)).toEqual({
      type: "object",
      properties: { total: { type: "string" } },
    })
  })

  test("switching to code with an unnamed field stays in the form", () => {
    renderDialog()
    addField()
    switchTab("Code")

    expect(screen.queryByLabelText("Schema")).toBeNull()
    expect(screen.getByRole("alert").textContent).toBe(fieldNameErrors.missing)
  })
})

describe("create store code to form", () => {
  test("an unsupported schema keeps the code view with a note", () => {
    renderDialog()
    switchTab("Code")
    fireEvent.change(screen.getByLabelText("Schema"), {
      target: {
        value: JSON.stringify({ type: "object", additionalProperties: false }),
      },
    })
    switchTab("Form")

    expect(screen.getByLabelText("Schema")).toBeDefined()
    expect(screen.getByText(/features the form view cannot edit/)).toBeDefined()
  })

  test("a supported schema loads back into the form", () => {
    renderDialog()
    switchTab("Code")
    fireEvent.change(screen.getByLabelText("Schema"), {
      target: {
        value: JSON.stringify({
          type: "object",
          properties: { total: { type: "number" } },
          required: ["total"],
        }),
      },
    })
    switchTab("Form")

    const nameInput = screen.getByLabelText("Field name") as HTMLInputElement

    expect(nameInput.value).toBe("total")
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true")
  })
})
