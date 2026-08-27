// The schema builder's field model: one row per property. Object fields
// (and arrays of objects) nest their child properties recursively. The
// conversion to and from JSON Schema lives in convert.ts.

/** Types an array's items may take. Nested arrays stay code-only. */
export type FieldItemType =
  | "boolean"
  | "integer"
  | "number"
  | "object"
  | "string"

export type FieldType = FieldItemType | "array"

export type SchemaField = {
  id: string
  name: string
  type: FieldType
  /** The item type when type is "array"; ignored otherwise. */
  itemType: FieldItemType
  required: boolean
  /** Child properties when this field, or its array item, is an object. */
  fields: SchemaField[]
}

export const fieldNameErrors = {
  duplicate: "Another field already uses this name.",
  missing: "Give this field a name.",
}

let fieldIdCounter = 0

export function createField(overrides?: Partial<SchemaField>): SchemaField {
  fieldIdCounter += 1

  return {
    id: `field-${fieldIdCounter}`,
    name: "",
    type: "string",
    itemType: "string",
    required: false,
    fields: [],
    ...overrides,
  }
}

/** Whether the field's nested child list is part of the emitted schema. */
export function hasChildFields(field: SchemaField) {
  return (
    field.type === "object" ||
    (field.type === "array" && field.itemType === "object")
  )
}

/** Field errors that block emitting a schema, keyed by field id. Only
 *  active branches count: children of a primitive field are never emitted,
 *  so they cannot block anything. */
export function collectFieldErrors(fields: SchemaField[]) {
  const errors: Record<string, string> = {}

  collectListErrors(fields, errors)

  return errors
}

function collectListErrors(
  fields: SchemaField[],
  errors: Record<string, string>
) {
  const seenNames = new Set<string>()

  for (const field of fields) {
    if (field.name.trim() === "") {
      errors[field.id] = fieldNameErrors.missing
    } else if (seenNames.has(field.name)) {
      errors[field.id] = fieldNameErrors.duplicate
    }

    seenNames.add(field.name)

    if (hasChildFields(field)) {
      collectListErrors(field.fields, errors)
    }
  }
}
