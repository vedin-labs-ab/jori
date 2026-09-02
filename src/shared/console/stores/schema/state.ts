import { type JsonSchemaObject } from "@contracts/schema/validate"
import { useState } from "react"
import { fieldsToSchema, schemaToFields } from "./convert"
import { collectFieldErrors, type SchemaField } from "./model"

// State for the schema builder: one row per property. A schema is authored
// through the rows or not at all, so there is no code view and nothing to
// cross between. Name errors stay hidden until a submit attempt and clear
// as soon as the offending input changes.

type SchemaEditorState = {
  /** The builder's rows, or undefined for a stored schema whose features
   *  the rows cannot represent. */
  fields: SchemaField[] | undefined
  /** Field-name errors by field id, shown after a failed submit. */
  fieldErrors: Record<string, string>
  /** A schema error the backend rejected the submit with. */
  submitError: string | undefined
}

type SchemaSubmitResult = { ok: true; schema: unknown } | { ok: false }

export type SchemaEditor = ReturnType<typeof useSchemaEditor>

/** Seed the builder from an existing schema. No schema starts with no
 *  rows; one written outside the builder starts with none at all, and
 *  only reads. */
function editorStateForSchema(
  schema: JsonSchemaObject | undefined
): SchemaEditorState {
  return {
    fields: schema === undefined ? [] : schemaToFields(schema),
    fieldErrors: {},
    submitError: undefined,
  }
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
    /** Whether the rows can be saved at all: an empty schema constrains
     *  nothing, and the backend refuses one. */
    canSubmit: state.fields !== undefined && state.fields.length > 0,
    setFields: (fields: SchemaField[]) =>
      setState((current) => ({ ...current, fields, submitError: undefined })),
    clearFieldError: (fieldId: string) =>
      setState(
        ({ fieldErrors: { [fieldId]: _cleared, ...kept }, ...rest }) => ({
          ...rest,
          fieldErrors: kept,
        })
      ),
    setSubmitError: (submitError: string) =>
      setState((current) => ({ ...current, submitError })),
  }
}

/** The rows emit a schema once every one of them carries a usable name. */
export function submitEditor(
  state: SchemaEditorState
): [SchemaEditorState, SchemaSubmitResult] {
  const { fields } = state

  if (fields === undefined || fields.length === 0) {
    return [state, { ok: false }]
  }

  const fieldErrors = collectFieldErrors(fields)

  if (Object.keys(fieldErrors).length > 0) {
    return [{ ...state, fieldErrors }, { ok: false }]
  }

  return [state, { ok: true, schema: fieldsToSchema(fields) }]
}
