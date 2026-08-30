import {
  type JsonSchemaObject,
  resolveWriteSchema,
  type SchemaValidationIssue,
  validateJsonSchemaValue,
} from "@contracts/schema/validate"
import { useMemo, useState } from "react"
import { formatJsonText, parseJsonText } from "../../shared/json/parse"
import {
  emptyState,
  stateToValue,
  type ValueState,
  valueToState,
} from "./convert"
import { schemaToForm, type ValueField } from "./model"

// State for the value editor: a form view over the schema-derived field
// model and a code view over raw JSON, mirroring the schema builder. The
// form is the default; a schema or value the form cannot hold — or a store
// with no schema at all — keeps the code view with a note, and crossing
// between views is never lossy.
// Errors stay hidden until a submit or view-switch attempt, and clear for
// a field as soon as its input changes.

export type ValueEditorView = "code" | "form"

export type ValueEditorState = {
  view: ValueEditorView
  root: ValueState
  codeText: string
  /** Validation messages by value path, shown after a failed submit. */
  fieldErrors: Record<string, string>
  /** JSON or schema errors on the code view, shown after a failed submit. */
  codeError: string | undefined
  /** Why the editor is, or stays, in the code view. */
  codeNote: string | undefined
}

export type ValueSubmitResult = { ok: true; value: unknown } | { ok: false }

export type ValueEditor = ReturnType<typeof useValueEditor>

export const valueEditorNotes = {
  none: "This store has no schema to build a form from, so the value is edited as code.",
  schema:
    "This store's schema uses JSON Schema features the form view cannot edit, so the value stays as code.",
  value: "The current value does not fit the form view, so it stays as code.",
}

/** The label validation paths hang off; fieldErrors keys start with it. */
export const valueRootPath = "value"

export function useValueEditor({
  hasValue,
  schema,
  value,
}: {
  hasValue: boolean
  schema: JsonSchemaObject | undefined
  value: unknown
}) {
  const constraint = resolveWriteSchema(schema)
  const formlessNote =
    schema === undefined ? valueEditorNotes.none : valueEditorNotes.schema
  const form = useMemo(
    () => (schema === undefined ? undefined : schemaToForm(schema)),
    [schema]
  )
  const [state, setState] = useState(() =>
    initialEditorState(form, value, hasValue, formlessNote)
  )

  function submit(): ValueSubmitResult {
    const [next, result] = submitEditor(state, form, constraint)

    setState(next)

    return result
  }

  return {
    form,
    state,
    submit,
    setRoot: (root: ValueState, editedPath: string) =>
      setState((current) => ({
        ...current,
        root,
        fieldErrors: clearPathErrors(current.fieldErrors, editedPath),
      })),
    setCodeText: (codeText: string) =>
      setState((current) => ({
        ...current,
        codeText,
        codeError: undefined,
        codeNote: undefined,
      })),
    switchView: (view: ValueEditorView) =>
      setState((current) =>
        view === "code"
          ? switchToCode(current, form)
          : switchToForm(current, form, formlessNote)
      ),
    /** Reseeds the whole editor from a fresh server value — after an
     *  external write lands while nothing local is pending. */
    reset: (value: unknown, hasValue: boolean) =>
      setState(initialEditorState(form, value, hasValue)),
  }
}

export function initialEditorState(
  form: ValueField | undefined,
  value: unknown,
  hasValue: boolean,
  formlessNote: string = valueEditorNotes.schema
): ValueEditorState {
  const base: ValueEditorState = {
    view: "form",
    root: { kind: "object", children: {} },
    codeText: hasValue ? formatJsonText(value) : "{}",
    fieldErrors: {},
    codeError: undefined,
    codeNote: undefined,
  }

  if (form === undefined) {
    return { ...base, view: "code", codeNote: formlessNote }
  }

  if (!hasValue) {
    return { ...base, root: emptyState(form) }
  }

  const root = valueToState(form, value)

  return root === undefined
    ? { ...base, view: "code", codeNote: valueEditorNotes.value }
    : { ...base, root }
}

/** Form -> code always carries the state over, but only once it can be
 *  serialized: unparseable inputs would otherwise be dropped silently. */
export function switchToCode(
  state: ValueEditorState,
  form: ValueField | undefined
): ValueEditorState {
  if (state.view === "code" || form === undefined) {
    return state
  }

  const serialized = stateToValue(form, state.root, valueRootPath)

  if (serialized.issues.length > 0) {
    return { ...state, fieldErrors: toErrorMap(serialized.issues) }
  }

  return {
    ...state,
    view: "code",
    codeText: formatJsonText(serialized.value),
    codeError: undefined,
    codeNote: undefined,
  }
}

/** Code -> form only when the JSON parses and fits the widgets; otherwise
 *  the code view keeps the text and explains why. */
export function switchToForm(
  state: ValueEditorState,
  form: ValueField | undefined,
  formlessNote: string = valueEditorNotes.schema
): ValueEditorState {
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

  if (form === undefined) {
    return { ...state, codeNote: formlessNote }
  }

  const root = valueToState(form, parsed.value)

  if (root === undefined) {
    return { ...state, codeNote: valueEditorNotes.value }
  }

  return {
    ...state,
    view: "form",
    root,
    fieldErrors: {},
    codeNote: undefined,
  }
}

export function submitEditor(
  state: ValueEditorState,
  form: ValueField | undefined,
  schema: JsonSchemaObject
): [ValueEditorState, ValueSubmitResult] {
  if (state.view !== "form" || form === undefined) {
    return submitCode(state, schema)
  }

  const serialized = stateToValue(form, state.root, valueRootPath)
  const issues =
    serialized.issues.length > 0
      ? serialized.issues
      : validateJsonSchemaValue(schema, serialized.value, valueRootPath)

  if (issues.length > 0) {
    return [{ ...state, fieldErrors: toErrorMap(issues) }, { ok: false }]
  }

  return [state, { ok: true, value: serialized.value }]
}

function submitCode(
  state: ValueEditorState,
  schema: JsonSchemaObject
): [ValueEditorState, ValueSubmitResult] {
  const parsed = parseJsonText(state.codeText)

  if (!parsed.ok) {
    return [{ ...state, codeError: parsed.error }, { ok: false }]
  }

  const issues = validateJsonSchemaValue(schema, parsed.value, valueRootPath)

  if (issues.length > 0) {
    return [{ ...state, codeError: joinIssues(issues) }, { ok: false }]
  }

  return [state, { ok: true, value: parsed.value }]
}

function toErrorMap(issues: SchemaValidationIssue[]) {
  const errors: Record<string, string> = {}

  for (const issue of issues) {
    errors[issue.path] ??= issue.message
  }

  return errors
}

function joinIssues(issues: SchemaValidationIssue[]) {
  return issues
    .slice(0, 3)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ")
}

function clearPathErrors(errors: Record<string, string>, path: string) {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([key]) => key !== path && !key.startsWith(`${path}.`)
    )
  )
}
