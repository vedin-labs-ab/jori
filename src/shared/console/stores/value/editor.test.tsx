// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { type StoreDetail } from "../types"
import { ValueEditorSection, type ValueEditorState } from "./editor"
import { valueEditorNotes } from "./state"

const writeValue = vi.fn()

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

beforeEach(() => {
  vi.useFakeTimers()
  writeValue.mockReset()
  writeValue.mockResolvedValue({})
})

/** Lets the debounce elapse and the save settle. */
async function settle(ms = 1200) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

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
    tags: { type: "array", items: { type: "string" }, maxItems: 1 },
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
    updatedAt: Date.now(),
  } as unknown as StoreDetail

  return render(
    <ValueEditorSection
      onWrite={writeValue}
      schema={schema}
      store={store}
      onState={(state) => {
        published = state
      }}
    />
  )
}

// Radix tabs select on mousedown, not click.
/** The last state the editor published: how the page's menu would switch
 *  the view. */
let published: ValueEditorState | undefined

function switchTab(name: "Code" | "Form") {
  act(() => published?.switchView(name === "Code" ? "code" : "form"))
}

describe("value editor error visibility", () => {
  test("an invalid draft surfaces its error and never writes", async () => {
    const view = renderEditor({
      title: "March",
      total: 2,
      paid: false,
      shipping: { city: "Oslo" },
      tags: ["ops"],
    })

    // Empty error strips make the compact cells taller than their key column.
    expect(screen.queryByRole("alert", { hidden: true })).toBeNull()

    const title = screen.getByLabelText("title")
    act(() => title.focus())
    fireEvent.change(title, { target: { value: "" } })

    expect(screen.queryByRole("alert", { hidden: true })).toBeNull()

    await settle()

    expect(screen.getByRole("alert").textContent).toBe("is required")
    expect(title.getAttribute("aria-invalid")).toBe("true")
    expect(title.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id
    )
    expect(view.container.contains(screen.getByRole("tooltip"))).toBe(false)
    expect(document.activeElement).toBe(title)
    expect((title as HTMLInputElement).value).toBe("")
    expect(writeValue).not.toHaveBeenCalled()

    fireEvent.change(title, { target: { value: "April" } })

    expect(screen.queryByRole("alert", { hidden: true })).toBeNull()
    expect(screen.queryByRole("tooltip")).toBeNull()
    expect(title.getAttribute("aria-invalid")).toBeNull()
    expect(title.getAttribute("aria-describedby")).toBeNull()
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
    await settle()

    expect(writeValue).toHaveBeenCalledOnce()
    expect(writeValue.mock.calls[0]).toEqual([
      {
        title: "March",
        total: 3.5,
        paid: true,
        shipping: { city: "Oslo" },
      },
      2,
    ])
  })

  test("clearing an optional group omits it again", async () => {
    renderEditor({
      title: "March",
      total: 2,
      paid: true,
      shipping: { city: "Oslo" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Unset shipping" }))
    await settle()

    expect(writeValue).toHaveBeenCalledOnce()
    expect(writeValue.mock.calls[0]?.[0]).toEqual({
      title: "March",
      total: 2,
      paid: true,
    })
  })
})

test("array validation appears in an overlay and clears after item removal", async () => {
  renderEditor({ title: "March", total: 2, paid: false })

  fireEvent.click(screen.getByRole("button", { name: "Add tags" }))
  fireEvent.click(screen.getByRole("button", { name: "Add tags item" }))
  fireEvent.click(screen.getByRole("button", { name: "Add tags item" }))
  fireEvent.change(screen.getByLabelText("tags item 1"), {
    target: { value: "ops" },
  })
  fireEvent.change(screen.getByLabelText("tags item 2"), {
    target: { value: "billing" },
  })
  const addItem = screen.getByRole("button", { name: "Add tags item" })

  act(() => addItem.focus())
  await settle()

  expect(writeValue).not.toHaveBeenCalled()
  expect(addItem.getAttribute("aria-invalid")).toBe("true")
  expect(addItem.getAttribute("aria-describedby")).toBe(
    screen.getByRole("alert").id
  )
  expect(screen.getByRole("tooltip")).toBeTruthy()
  expect(document.activeElement).toBe(addItem)

  fireEvent.click(screen.getByRole("button", { name: "Remove tags item 2" }))
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByRole("tooltip")).toBeNull()
  await settle()

  expect(writeValue).toHaveBeenCalledOnce()
  expect(writeValue.mock.calls[0]?.[0]).toEqual({
    title: "March",
    total: 2,
    paid: false,
    tags: ["ops"],
  })
})

describe("value editor no-op saves", () => {
  test("a buffer back at the saved value writes nothing", async () => {
    renderEditor({ title: "March", total: 2, paid: false })

    const title = screen.getByLabelText("title")
    fireEvent.change(title, { target: { value: "April" } })
    fireEvent.change(title, { target: { value: "March" } })
    await settle()

    expect(writeValue).not.toHaveBeenCalled()
  })
})

describe("value editor form and code views", () => {
  test("the code view mirrors the form state read-only", async () => {
    // The mirror is a lazy chunk, so this one waits on real time.
    vi.useRealTimers()
    renderEditor({ title: "March", total: 2, paid: false })
    switchTab("Code")

    expect(await screen.findByText(/"March"/)).toBeDefined()
    expect(screen.queryByLabelText("Store value JSON")).toBeNull()
  })

  test("editable code with broken JSON refuses the form view", () => {
    renderEditor({ title: 7, total: 2, paid: false })
    fireEvent.change(screen.getByLabelText("Store value JSON"), {
      target: { value: "{ nope" },
    })
    switchTab("Form")

    expect(screen.getByLabelText("Store value JSON")).toBeDefined()
    expect(
      screen.getByText(/Fix the JSON to switch to the form view/)
    ).toBeDefined()
  })

  test("a value the form cannot hold opens as editable code with a note", () => {
    renderEditor({ title: 7, total: 2, paid: false })

    expect(screen.getByLabelText("Store value JSON")).toBeDefined()
    expect(screen.getByText(valueEditorNotes.value)).toBeDefined()
  })
})
