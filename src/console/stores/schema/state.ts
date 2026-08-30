import { type JsonSchemaObject } from "@contracts/schema/validate"
import { normalizeStoreSchema } from "@contracts/stores/contract"
import { useState } from "react"
import { formatJsonText, parseJsonText } from "../../shared/json/parse"
import { fieldsToSchema, schemaToFields } from "./convert"
import { collectFieldErrors, type SchemaField } from "./model"

// State for the schema editor: a form view over the field model and a code
// view over raw JSON, kept honest by only crossing between them when the
// crossing is lossless. Errors stay hidden until a submit or view-switch
// attempt, and clear as soon as the offending input changes.

export type SchemaEditorView = "code" | "form"

export type SchemaEditorState = {
  view: SchemaEditorView
  fields: SchemaField[]
  codeText: string
  /** Field-name errors by field id, shown after a failed submit or switch. */
  fieldErrors: Record<string, string>
  /** JSON or schema errors on the code view, shown after a failed submit. */
  codeError: string | undefined
  /** Why a code -> form switch stayed in the code view. */
  codeNote: string | undefined
  /** A schema error the backend rejected the submit with. */
  submitError: string | undefined
}

export type SchemaSubmitResult = { ok: true; schema: unknown } | { ok: false }

export type SchemaEditor = ReturnType<typeof useSchemaEditor>

export const initialEditorState: SchemaEditorState = {
  view: "form",
  fields: [],
  codeText: "",
  fieldErrors: {},
  codeError: undefined,
  codeNote: undefined,
  submitError: undefined,
}

const formlessNote =
  "This schema uses JSON Schema features the form view cannot edit, so it stays as code."

/** Seed the editor from an existing schema: the form view when the schema
 *  fits it, the code view with a note otherwise. No schema starts empty. */
export function editorStateForSchema(
  schema: JsonSchemaObject | undefined
): SchemaEditorState {
  if (schema === undefined) {
    return initialEditorState
  }

  const fields = schemaToFields(schema)

  return fields === undefined
    ? {
        ...initialEditorState,
        view: "code",
        codeText: formatJsonText(schema),
        codeNote: formlessNote,
      }
    : { ...initialEditorState, fields }
}

export function useSchemaEditor(initial?: JsonSchemaObject) {
  const [state, setState] = useState(() => editorStateForSchema(initial))

  function submit(): SchemaSubmitResult {
    const [next, result] = submitEditor(state)

    setState(next)

    return result
  }

  return {
    state,
    submit,
    reset: () => setState(initialEditorState),
    setFields: (fields: SchemaField[]) =>
      setState((current) => ({ ...current, fields, submitError: undefined })),
    clearFieldError: (fieldId: string) =>
      setState(
        ({ fieldErrors: { [fieldId]: _cleared, ...kept }, ...rest }) => ({
          ...rest,
          fieldErrors: kept,
        })
      ),
    setCodeText: (codeText: string) =>
      setState((current) => ({
        ...current,
        codeText,
        codeError: undefined,
        codeNote: undefined,
        submitError: undefined,
      })),
    switchView: (view: SchemaEditorView) =>
      setState((current) =>
        view === "code" ? switchToCode(current) : switchToForm(current)
      ),
    setSubmitError: (submitError: string) =>
      setState((current) => ({ ...current, submitError })),
  }
}

/** Form -> code always carries the fields over, but only once they can be
 *  emitted: broken names would otherwise be dropped or collide silently. */
export function switchToCode(state: SchemaEditorState): SchemaEditorState {
  if (state.view === "code") {
    return state
  }

  const fieldErrors = collectFieldErrors(state.fields)

  if (Object.keys(fieldErrors).length > 0) {
    return { ...state, fieldErrors }
  }

  return {
    ...state,
    view: "code",
    codeText: formatJsonText(fieldsToSchema(state.fields)),
    codeError: undefined,
    codeNote: undefined,
  }
}

/** Code -> form only when the JSON parses and uses form-editable constructs;
 *  otherwise the code view keeps the schema and explains why. */
export function switchToForm(state: SchemaEditorState): SchemaEditorState {
  if (state.view === "form") {
    return state
  }

  const parsed = parseJsonText(state.codeText)

  if (!parsed.ok) {
    return {
      ...state,
      codeNote: `Fix the JSON to switch to the form view: ${parsed.error}`,
    }
  }

  const fields = schemaToFields(parsed.value)

  if (fields === undefined) {
    return { ...state, codeNote: formlessNote }
  }

  return {
    ...state,
    view: "form",
    fields,
    fieldErrors: {},
    codeNote: undefined,
  }
}

export function submitEditor(
  state: SchemaEditorState
): [SchemaEditorState, SchemaSubmitResult] {
  if (state.view === "form") {
    const fieldErrors = collectFieldErrors(state.fields)

    if (Object.keys(fieldErrors).length > 0) {
      return [{ ...state, fieldErrors }, { ok: false }]
    }

    return [state, { ok: true, schema: fieldsToSchema(state.fields) }]
  }

  return submitCode(state)
}

function submitCode(
  state: SchemaEditorState
): [SchemaEditorState, SchemaSubmitResult] {
  const parsed = parseJsonText(state.codeText)

  if (!parsed.ok) {
    return [{ ...state, codeError: parsed.error }, { ok: false }]
  }

  try {
    normalizeStoreSchema(parsed.value)
  } catch (error) {
    const codeError = error instanceof Error ? error.message : "Invalid schema."

    return [{ ...state, codeError }, { ok: false }]
  }

  return [state, { ok: true, schema: parsed.value }]
}
