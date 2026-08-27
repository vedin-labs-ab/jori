import { describe, expect, test } from "vitest"
import { type ValueState } from "./convert"
import { schemaToForm } from "./model"
import {
  initialEditorState,
  submitEditor,
  switchToCode,
  switchToForm,
  valueEditorNotes,
} from "./state"

const schema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 3 },
    total: { type: "number" },
    notes: { type: "string" },
  },
  required: ["title", "total"],
}
const form = schemaToForm(schema)

function formState(children: Record<string, ValueState>): ValueState {
  return { kind: "object", children }
}

describe("initial editor state", () => {
  test("a representable schema without a value opens the empty form", () => {
    const state = initialEditorState(form, null, false)

    expect(state.view).toBe("form")
    expect(state.codeText).toBe("{}")
  })

  test("an unsupported schema opens as code with a note", () => {
    const state = initialEditorState(undefined, { any: 1 }, true)

    expect(state.view).toBe("code")
    expect(state.codeNote).toBe(valueEditorNotes.schema)
  })

  test("a value the widgets cannot hold opens as code with a note", () => {
    const state = initialEditorState(form, { title: 7, total: 1 }, true)

    expect(state.view).toBe("code")
    expect(state.codeNote).toBe(valueEditorNotes.value)
    expect(JSON.parse(state.codeText)).toEqual({ title: 7, total: 1 })
  })

  test("a fitting value opens in the form", () => {
    const state = initialEditorState(form, { title: "abc", total: 2 }, true)

    expect(state.view).toBe("form")
  })
})

describe("view switching", () => {
  test("form to code serializes the current form state", () => {
    const state = initialEditorState(form, { title: "abc", total: 2 }, true)
    const next = switchToCode(state, form)

    expect(next.view).toBe("code")
    expect(JSON.parse(next.codeText)).toEqual({ title: "abc", total: 2 })
  })

  test("form to code stays put when an input cannot serialize", () => {
    const state = {
      ...initialEditorState(form, null, false),
      root: formState({ total: { kind: "text", text: "wat" } }),
    }
    const next = switchToCode(state, form)

    expect(next.view).toBe("form")
    expect(next.fieldErrors).toEqual({ "value.total": "must be a number" })
  })

  test("code to form re-parses and loads the value", () => {
    const state = {
      ...initialEditorState(form, null, false),
      view: "code" as const,
      codeText: '{ "title": "abc", "total": 4 }',
    }
    const next = switchToForm(state, form)

    expect(next.view).toBe("form")
    expect(next.codeNote).toBeUndefined()
  })

  test("code to form keeps invalid JSON with a note", () => {
    const state = {
      ...initialEditorState(form, null, false),
      view: "code" as const,
      codeText: "{ nope",
    }
    const next = switchToForm(state, form)

    expect(next.view).toBe("code")
    expect(next.codeNote).toContain("Fix the JSON to switch to the form view")
    expect(next.codeText).toBe("{ nope")
  })

  test("code to form keeps an unfittable value with a note", () => {
    const state = {
      ...initialEditorState(form, null, false),
      view: "code" as const,
      codeText: '{ "unknown": true }',
    }
    const next = switchToForm(state, form)

    expect(next.view).toBe("code")
    expect(next.codeNote).toBe(valueEditorNotes.value)
  })
})

describe("submitting the form view", () => {
  test("missing required fields error at their paths", () => {
    const state = initialEditorState(form, null, false)
    const [next, result] = submitEditor(state, form, schema)

    expect(result).toEqual({ ok: false })
    expect(next.fieldErrors).toEqual({
      "value.title": "is required",
      "value.total": "is required",
    })
  })

  test("constraint violations surface through the contracts validator", () => {
    const state = {
      ...initialEditorState(form, null, false),
      root: formState({
        title: { kind: "text", text: "ab" },
        total: { kind: "text", text: "2" },
      }),
    }
    const [next, result] = submitEditor(state, form, schema)

    expect(result).toEqual({ ok: false })
    expect(next.fieldErrors["value.title"]).toContain("at least 3")
  })

  test("a clean form produces the value, omitting empty optionals", () => {
    const state = {
      ...initialEditorState(form, null, false),
      root: formState({
        title: { kind: "text", text: "abc" },
        total: { kind: "text", text: "2" },
        notes: { kind: "text", text: "" },
      }),
    }
    const [, result] = submitEditor(state, form, schema)

    expect(result).toEqual({ ok: true, value: { title: "abc", total: 2 } })
  })
})

describe("submitting the code view", () => {
  test("invalid JSON errors inline", () => {
    const state = {
      ...initialEditorState(form, null, false),
      view: "code" as const,
      codeText: "{ nope",
    }
    const [next, result] = submitEditor(state, form, schema)

    expect(result).toEqual({ ok: false })
    expect(next.codeError).toBeDefined()
  })

  test("schema violations error inline with their paths", () => {
    const state = {
      ...initialEditorState(form, null, false),
      view: "code" as const,
      codeText: '{ "title": "abc" }',
    }
    const [next, result] = submitEditor(state, form, schema)

    expect(result).toEqual({ ok: false })
    expect(next.codeError).toContain("value.total: is required")
  })

  test("a valid document submits as written", () => {
    const state = {
      ...initialEditorState(form, null, false),
      view: "code" as const,
      codeText: '{ "title": "abc", "total": 9 }',
    }
    const [, result] = submitEditor(state, form, schema)

    expect(result).toEqual({ ok: true, value: { title: "abc", total: 9 } })
  })
})
