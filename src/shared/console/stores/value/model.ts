import { isRecord, readStringArray } from "@contracts/json"

// The value form's field model, derived from a store's JSON Schema. The
// derivation covers the shapes the form can edit: objects with declared
// properties, arrays of one item shape, the primitive types, enums of
// scalar options, and fixed const or null nodes. Everything else the
// schema contract allows (anyOf, map-like objects via additionalProperties
// schemas, propertyNames, open arrays, enums of compound values) stays
// code-only: schemaToForm returns undefined for it. Constraint keywords
// (pattern, bounds, sizes) never block the form; the contracts validator
// enforces them on submit.

export type ValueField =
  | { kind: "array"; items: ValueField }
  | { kind: "boolean" }
  | { kind: "constant"; value: unknown }
  | { kind: "enum"; options: ValueOption[] }
  | { kind: "number"; integer: boolean }
  | { kind: "object"; properties: ValueProperty[] }
  | { kind: "string" }

/** Enum options the form can offer: scalar JSON values only. */
export type ValueOption = boolean | null | number | string

export type ValueProperty = {
  name: string
  required: boolean
  field: ValueField
}

/** Derive the form model for a store schema, or undefined when the schema
 *  uses constructs the form cannot represent. */
export function schemaToForm(schema: unknown): ValueField | undefined {
  const field = readField(schema)

  return field?.kind === "object" ? field : undefined
}

function readField(node: unknown): ValueField | undefined {
  if (!isRecord(node) || node.anyOf !== undefined) {
    return undefined
  }

  if (node.const !== undefined) {
    return { kind: "constant", value: node.const }
  }

  if (node.enum !== undefined) {
    return readEnumField(node.enum)
  }

  switch (node.type) {
    case "array":
      return readArrayField(node)
    case "boolean":
      return { kind: "boolean" }
    case "integer":
      return { kind: "number", integer: true }
    case "null":
      return { kind: "constant", value: null }
    case "number":
      return { kind: "number", integer: false }
    case "object":
      return readObjectField(node)
    case "string":
      return { kind: "string" }
    default:
      return undefined
  }
}

function readEnumField(options: unknown): ValueField | undefined {
  return Array.isArray(options) &&
    options.length > 0 &&
    options.every(isValueOption)
    ? { kind: "enum", options }
    : undefined
}

function isValueOption(option: unknown): option is ValueOption {
  return (
    option === null ||
    typeof option === "boolean" ||
    typeof option === "number" ||
    typeof option === "string"
  )
}

function readObjectField(
  node: Record<string, unknown>
): ValueField | undefined {
  // A schema for undeclared entries makes the object map-like; the form
  // only edits declared properties, so such objects stay code-only.
  if (node.propertyNames !== undefined || isRecord(node.additionalProperties)) {
    return undefined
  }

  const propertyNodes = node.properties ?? {}

  if (!isRecord(propertyNodes)) {
    return undefined
  }

  const names = Object.keys(propertyNodes)
  const required = new Set(readStringArray(node.required))

  if (![...required].every((name) => names.includes(name))) {
    return undefined
  }

  const properties: ValueProperty[] = []

  for (const [name, propertyNode] of Object.entries(propertyNodes)) {
    const field = readPropertyField(propertyNode, required.has(name))

    if (field === undefined) {
      return undefined
    }

    properties.push({ name, required: required.has(name), field })
  }

  return { kind: "object", properties }
}

/** An optional boolean needs a real empty state a checkbox cannot give, so
 *  it becomes a true/false choice with an explicit unset. */
function readPropertyField(node: unknown, required: boolean) {
  const field = readField(node)

  return field?.kind === "boolean" && !required
    ? ({ kind: "enum", options: [true, false] } satisfies ValueField)
    : field
}

function readArrayField(node: Record<string, unknown>): ValueField | undefined {
  if (!isRecord(node.items)) {
    return undefined
  }

  const items = readField(node.items)

  return items === undefined ? undefined : { kind: "array", items }
}
