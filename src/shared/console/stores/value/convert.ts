import { isRecord } from "@contracts/json"
import { type SchemaValidationIssue } from "@contracts/schema/validate"
import { type ValueField, type ValueProperty } from "./model"

// Form state <-> JSON value, walked in parallel with the field model. An
// optional scalar left empty stays out of the produced value; an optional
// object, array, or constant is unset until its key is materialized in the
// parent's children. Structural mismatches (a value the widgets cannot
// hold) fail the load; constraint violations load fine and surface when
// the contracts validator runs on submit.

export type ValueState =
  | { kind: "array"; items: ValueState[] }
  | { kind: "check"; checked: boolean }
  | { kind: "choice"; index: number | undefined }
  | { kind: "constant" }
  | { kind: "object"; children: Record<string, ValueState | undefined> }
  | { kind: "text"; text: string }

export function emptyState(field: ValueField): ValueState {
  switch (field.kind) {
    case "array":
      return { kind: "array", items: [] }
    case "boolean":
      return { kind: "check", checked: false }
    case "enum":
      return { kind: "choice", index: undefined }
    case "constant":
      return { kind: "constant" }
    case "number":
    case "string":
      return { kind: "text", text: "" }
    case "object":
      return { kind: "object", children: emptyChildren(field.properties) }
  }
}

function emptyChildren(properties: ValueProperty[]) {
  const children: Record<string, ValueState | undefined> = {}

  for (const property of properties) {
    if (property.required || !hasUnsetAffordance(property.field)) {
      children[property.name] = emptyState(property.field)
    }
  }

  return children
}

/** Whether an optional property of this shape starts unset behind an
 *  explicit add control, instead of always showing an empty widget. */
export function hasUnsetAffordance(field: ValueField) {
  return (
    field.kind === "array" ||
    field.kind === "constant" ||
    field.kind === "object"
  )
}

/** Load a JSON value into form state, or undefined when it does not fit
 *  the widgets: wrong types, undeclared keys, unknown enum values, or a
 *  constant mismatch. Missing properties load as unset. */
export function valueToState(
  field: ValueField,
  value: unknown
): ValueState | undefined {
  switch (field.kind) {
    case "array":
      return loadArray(field.items, value)
    case "boolean":
      return typeof value === "boolean"
        ? { kind: "check", checked: value }
        : undefined
    case "constant":
      return sameJsonValue(field.value, value)
        ? { kind: "constant" }
        : undefined
    case "enum":
      return loadChoice(field.options, value)
    case "number":
      return typeof value === "number"
        ? { kind: "text", text: String(value) }
        : undefined
    case "object":
      return loadObject(field.properties, value)
    case "string":
      return typeof value === "string"
        ? { kind: "text", text: value }
        : undefined
  }
}

function loadChoice(
  options: unknown[],
  value: unknown
): ValueState | undefined {
  const index = options.findIndex((option) => sameJsonValue(option, value))

  return index === -1 ? undefined : { kind: "choice", index }
}

function loadObject(
  properties: ValueProperty[],
  value: unknown
): ValueState | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const declared = new Set(properties.map((property) => property.name))

  if (!Object.keys(value).every((key) => declared.has(key))) {
    return undefined
  }

  const children: Record<string, ValueState | undefined> = {}

  for (const property of properties) {
    if (Object.hasOwn(value, property.name)) {
      const child = valueToState(property.field, value[property.name])

      if (child === undefined) {
        return undefined
      }

      children[property.name] = child
    } else if (property.required || !hasUnsetAffordance(property.field)) {
      children[property.name] = emptyState(property.field)
    }
  }

  return { kind: "object", children }
}

function loadArray(items: ValueField, value: unknown): ValueState | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const states: ValueState[] = []

  for (const item of value) {
    const state = valueToState(items, item)

    if (state === undefined) {
      return undefined
    }

    states.push(state)
  }

  return { kind: "array", items: states }
}

export type Serialized = {
  value: unknown
  issues: SchemaValidationIssue[]
}

/** Produce the JSON value the form state describes. Issues cover only what
 *  the widgets themselves cannot express as JSON — unparseable number text
 *  and unset choices that cannot be omitted; everything else is left to
 *  the contracts validator on the produced value. */
export function stateToValue(
  field: ValueField,
  state: ValueState,
  path: string
): Serialized {
  if (field.kind === "object" && state.kind === "object") {
    return serializeObject(field.properties, state.children, path)
  }

  if (field.kind === "array" && state.kind === "array") {
    return serializeArray(field.items, state.items, path)
  }

  return serializeLeaf(field, state, path)
}

function serializeLeaf(
  field: ValueField,
  state: ValueState,
  path: string
): Serialized {
  if (field.kind === "constant") {
    return { value: field.value, issues: [] }
  }

  if (state.kind === "check") {
    return { value: state.checked, issues: [] }
  }

  if (field.kind === "enum" && state.kind === "choice") {
    return state.index === undefined
      ? { value: null, issues: [{ path, message: "is required" }] }
      : { value: field.options[state.index], issues: [] }
  }

  if (state.kind === "text") {
    return field.kind === "number"
      ? serializeNumber(state.text, path)
      : { value: state.text, issues: [] }
  }

  return { value: null, issues: [{ path, message: "cannot be built" }] }
}

function serializeNumber(text: string, path: string): Serialized {
  const parsed = Number(text.trim())

  return text.trim() === "" || Number.isNaN(parsed)
    ? { value: null, issues: [{ path, message: "must be a number" }] }
    : { value: parsed, issues: [] }
}

function serializeObject(
  properties: ValueProperty[],
  children: Record<string, ValueState | undefined>,
  path: string
): Serialized {
  const value: Record<string, unknown> = {}
  const issues: SchemaValidationIssue[] = []

  for (const property of properties) {
    const child = children[property.name]

    if (child === undefined || isEmpty(child)) {
      continue
    }

    const serialized = stateToValue(
      property.field,
      child,
      `${path}.${property.name}`
    )

    value[property.name] = serialized.value
    issues.push(...serialized.issues)
  }

  return { value, issues }
}

/** An empty widget stays out of the value: the contracts validator then
 *  reports missing required properties at the right paths. */
function isEmpty(state: ValueState) {
  return (
    (state.kind === "text" && state.text.trim() === "") ||
    (state.kind === "choice" && state.index === undefined)
  )
}

function serializeArray(
  items: ValueField,
  states: ValueState[],
  path: string
): Serialized {
  const serialized = states.map((state, index) =>
    stateToValue(items, state, `${path}.${index}`)
  )

  return {
    value: serialized.map((item) => item.value),
    issues: serialized.flatMap((item) => item.issues),
  }
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}
