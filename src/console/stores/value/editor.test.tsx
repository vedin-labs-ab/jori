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
import { ValueEditorSection } from "./editor"
import { valueEditorNotes } from "./state"

const writeValue = vi.fn()

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => writeValue,
}))

afterEach(cleanup)

beforeEach(() => {
  writeValue.mockReset()
  writeValue.mockResolvedValue({})
})

const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    total: { type: "number" },
    paid: { type: "boolean" },
    shipping: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
  required: ["title", "total", "paid"],
}

function renderEditor(value: unknown, version = 2) {
  const store = {
    storeId: "store-1",
    version,
    schema,
    value,
    archivedAt: undefined,
  } as unknown as StoreDetail

  render(
    <ValueEditorSection
      onClose={() => undefined}
      organizationId="org-1"
      store={store}
    />
  )
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Save value" }))
}

// Radix tabs select on mousedown, not click.
function switchTab(name: "Code" | "Form") {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 })
}

describe("value editor error visibility", () => {
  test("errors appear on submit and clear as the field changes", () => {
    renderEditor({ title: "March", total: 2, paid: false })

    const title = screen.getByLabelText("title")
    fireEvent.change(title, { target: { value: "" } })

    expect(screen.queryByRole("alert")).toBeNull()

    submit()

    expect(screen.getByRole("alert").textContent).toBe("is required")
    expect(writeValue).not.toHaveBeenCalled()

    fireEvent.change(title, { target: { value: "April" } })

    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("value editor submission", () => {
  test("the form produces the value the mutation receives", async () => {
    renderEditor({ title: "March", total: 2, paid: false })

    fireEvent.change(screen.getByLabelText("total"), {
      target: { value: "3.5" },
    })
    fireEvent.click(screen.getByLabelText("paid"))
    fireEvent.click(screen.getByRole("button", { name: "Add shipping" }))
    fireEvent.change(screen.getByLabelText("city"), {
      target: { value: "Oslo" },
    })
    submit()

    await waitFor(() => expect(writeValue).toHaveBeenCalledOnce())
    expect(writeValue.mock.calls[0]?.[0]).toEqual({
      organizationId: "org-1",
      storeId: "store-1",
      expectedVersion: 2,
      value: {
        title: "March",
        total: 3.5,
        paid: true,
        shipping: { city: "Oslo" },
      },
    })
  })

  test("clearing an optional group omits it again", async () => {
    renderEditor({
      title: "March",
      total: 2,
      paid: true,
      shipping: { city: "Oslo" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Unset shipping" }))
    submit()

    await waitFor(() => expect(writeValue).toHaveBeenCalledOnce())
    expect(writeValue.mock.calls[0]?.[0].value).toEqual({
      title: "March",
      total: 2,
      paid: true,
    })
  })
})

describe("value editor form and code views", () => {
  test("switching to code serializes the form state", () => {
    renderEditor({ title: "March", total: 2, paid: false })
    switchTab("Code")

    const textarea = screen.getByLabelText(
      "Store value JSON"
    ) as HTMLTextAreaElement

    expect(JSON.parse(textarea.value)).toEqual({
      title: "March",
      total: 2,
      paid: false,
    })
  })

  test("broken JSON keeps the code view with a note", () => {
    renderEditor({ title: "March", total: 2, paid: false })
    switchTab("Code")
    fireEvent.change(screen.getByLabelText("Store value JSON"), {
      target: { value: "{ nope" },
    })
    switchTab("Form")

    expect(screen.getByLabelText("Store value JSON")).toBeDefined()
    expect(
      screen.getByText(/Fix the JSON to switch to the form view/)
    ).toBeDefined()
  })

  test("a value the form cannot hold opens as code with a note", () => {
    renderEditor({ title: 7, total: 2, paid: false })

    expect(screen.getByLabelText("Store value JSON")).toBeDefined()
    expect(screen.getByText(valueEditorNotes.value)).toBeDefined()
  })
})
