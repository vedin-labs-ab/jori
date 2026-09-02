import { describe, expect, test } from "vitest"
import {
  emptyState,
  stateToValue,
  type ValueState,
  valueToState,
} from "./convert"
import { schemaToForm, type ValueField } from "./model"

function deriveForm(schema: unknown): ValueField {
  const form = schemaToForm(schema)

  if (form === undefined) {
    throw new Error("Expected a form-representable schema.")
  }

  return form
}

const invoiceForm = deriveForm({
  type: "object",
  properties: {
    title: { type: "string" },
    total: { type: "number" },
    paid: { type: "boolean" },
    status: { enum: ["draft", "sent"] },
    notes: { type: "string" },
    shipping: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "total", "paid", "status"],
})

describe("emptyState", () => {
  test("scalars materialize empty while optional groups stay unset", () => {
    const state = emptyState(invoiceForm)

    if (state.kind !== "object") {
      throw new Error("Expected object state.")
    }

    expect(state.children.title).toEqual({ kind: "text", text: "" })
    expect(state.children.paid).toEqual({ kind: "check", checked: false })
    expect(state.children.status).toEqual({ kind: "choice", index: undefined })
    expect(state.children.notes).toEqual({ kind: "text", text: "" })
    expect(state.children.shipping).toBeUndefined()
    expect(state.children.tags).toBeUndefined()
  })
})

describe("valueToState", () => {
  test("loads a matching value, leaving absent fields unset", () => {
    const state = valueToState(invoiceForm, {
      title: "March",
      total: 12.5,
      paid: false,
      status: "sent",
      tags: ["a", "b"],
    })

    if (state?.kind !== "object") {
      throw new Error("Expected object state.")
    }

    expect(state.children.title).toEqual({ kind: "text", text: "March" })
    expect(state.children.total).toEqual({ kind: "text", text: "12.5" })
    expect(state.children.paid).toEqual({ kind: "check", checked: false })
    expect(state.children.status).toEqual({ kind: "choice", index: 1 })
    expect(state.children.tags).toEqual({
      kind: "array",
      items: [
        { kind: "text", text: "a" },
        { kind: "text", text: "b" },
      ],
    })
    expect(state.children.shipping).toBeUndefined()
  })

  test("a missing required scalar loads as an empty widget", () => {
    const state = valueToState(invoiceForm, {
      total: 1,
      paid: true,
      status: "draft",
    })

    if (state?.kind !== "object") {
      throw new Error("Expected object state.")
    }

    expect(state.children.title).toEqual({ kind: "text", text: "" })
  })

  const misfits: [string, unknown][] = [
    ["a non-object", ["not", "an", "object"]],
    [
      "an undeclared key",
      { title: "x", total: 1, paid: true, status: "draft", extra: 1 },
    ],
    ["a mistyped field", { title: 7, total: 1, paid: true, status: "draft" }],
    [
      "an unknown enum value",
      { title: "x", total: 1, paid: true, status: "gone" },
    ],
    [
      "a mistyped array item",
      { title: "x", total: 1, paid: true, status: "draft", tags: [1] },
    ],
  ]

  test.each(misfits)("%s fails the load", (_label, value) => {
    expect(valueToState(invoiceForm, value)).toBeUndefined()
  })

  test("a constant must match to load", () => {
    const constantForm = deriveForm({
      type: "object",
      properties: { kind: { const: "invoice" } },
    })

    expect(valueToState(constantForm, { kind: "invoice" })).toBeDefined()
    expect(valueToState(constantForm, { kind: "receipt" })).toBeUndefined()
  })
})

describe("stateToValue", () => {
  test("round-trips a loaded value unchanged", () => {
    const value = {
      title: "March",
      total: 12.5,
      paid: true,
      status: "draft",
      shipping: { city: "Oslo" },
      tags: ["a"],
    }
    const state = valueToState(invoiceForm, value)

    if (state === undefined) {
      throw new Error("Expected the value to load.")
    }

    expect(stateToValue(invoiceForm, state, "value")).toEqual({
      value,
      issues: [],
    })
  })

  test("empty optional fields stay out of the value", () => {
    const state = valueToState(invoiceForm, {
      title: "March",
      total: 3,
      paid: true,
      status: "draft",
    })

    if (state === undefined) {
      throw new Error("Expected the value to load.")
    }

    const serialized = stateToValue(invoiceForm, state, "value")

    expect(serialized.issues).toEqual([])
    expect(serialized.value).toEqual({
      title: "March",
      total: 3,
      paid: true,
      status: "draft",
    })
  })

  test("empty required fields are omitted for the validator to flag", () => {
    const serialized = stateToValue(
      invoiceForm,
      emptyState(invoiceForm),
      "value"
    )

    expect(serialized.issues).toEqual([])
    expect(serialized.value).toEqual({ paid: false })
  })
})

describe("stateToValue issues", () => {
  test("number text coerces, and unparseable text is an issue", () => {
    const numberForm = deriveForm({
      type: "object",
      properties: { total: { type: "number" } },
      required: ["total"],
    })
    const typed: ValueState = {
      kind: "object",
      children: { total: { kind: "text", text: " 42.5 " } },
    }
    expect(stateToValue(numberForm, typed, "value").value).toEqual({
      total: 42.5,
    })

    const broken: ValueState = {
      kind: "object",
      children: { total: { kind: "text", text: "wat" } },
    }
    expect(stateToValue(numberForm, broken, "value").issues).toEqual([
      { path: "value.total", message: "must be a number" },
    ])
  })

  test("array items cannot be omitted, so empty rows raise issues", () => {
    const listForm = deriveForm({
      type: "object",
      properties: {
        counts: { type: "array", items: { type: "integer" } },
        picks: { type: "array", items: { enum: ["a", "b"] } },
      },
    })
    const state: ValueState = {
      kind: "object",
      children: {
        counts: { kind: "array", items: [{ kind: "text", text: "" }] },
        picks: { kind: "array", items: [{ kind: "choice", index: undefined }] },
      },
    }

    expect(stateToValue(listForm, state, "value").issues).toEqual([
      { path: "value.counts.0", message: "must be a number" },
      { path: "value.picks.0", message: "is required" },
    ])
  })
})
