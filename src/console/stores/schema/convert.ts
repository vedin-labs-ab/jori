import { isRecord } from "@contracts/json"
import { type JsonSchemaObject } from "@contracts/schema/validate"
import { createField, type FieldItemType, type SchemaField } from "./model"

// Field model <-> JSON Schema. The builder covers the plain-shape subset of
// the store schema contract: an object root with properties and required,
// nested objects, arrays of primitives or objects, and the four primitive
// types. Everything else the contract allows (enum, const, anyOf, null,
// nested arrays, additionalProperties, size and pattern constraints) is
// valid but code-only: schemaToFields returns undefined for it.

const primitiveTypes = new Set(["boolean", "integer", "number", "string"])

export function fieldsToSchema(fields: SchemaField[]): JsonSchemaObject {
  return objectSchema(fields)
}

function objectSchema(fields: SchemaField[]): JsonSchemaObject {
  const schema: JsonSchemaObject = { type: "object" }

  if (fields.length === 0) {
    return schema
  }

  schema.properties = Object.fromEntries(
    fields.map((field) => [field.name, fieldSchema(field)])
  )

  const required = fields
    .filter((field) => field.required)
    .map((field) => field.name)

  if (required.length > 0) {
    schema.required = required
  }

  return schema
}

function fieldSchema(field: SchemaField): JsonSchemaObject {
  if (field.type === "object") {
    return objectSchema(field.fields)
  }

  if (field.type === "array") {
    return {
      type: "array",
      items:
        field.itemType === "object"
          ? objectSchema(field.fields)
          : { type: field.itemType },
    }
  }

  return { type: field.type }
}

/** Load a parsed JSON Schema into the field model, or undefined when the
 *  schema uses constructs the builder cannot represent losslessly. */
export function schemaToFields(schema: unknown): SchemaField[] | undefined {
  return readObjectFields(schema)
}

function readObjectFields(node: unknown): SchemaField[] | undefined {
  if (
    !isRecord(node) ||
    node.type !== "object" ||
    !hasOnlyKeys(node, ["type", "properties", "required"])
  ) {
    return undefined
  }

  if (node.properties === undefined) {
    return node.required === undefined ? [] : undefined
  }

  if (!isRecord(node.properties)) {
    return undefined
  }

  const propertyNames = Object.keys(node.properties)
  const requiredNames =
    node.required === undefined
      ? new Set<string>()
      : readRequiredNames(node.required, propertyNames)

  if (requiredNames === undefined) {
    return undefined
  }

  const fields: SchemaField[] = []

  for (const [name, property] of Object.entries(node.properties)) {
    const field = readField(name, property, requiredNames.has(name))

    if (field === undefined) {
      return undefined
    }

    fields.push(field)
  }

  return fields
}

function readRequiredNames(value: unknown, propertyNames: string[]) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const names = new Set<string>()

  for (const entry of value) {
    const isKnownName =
      typeof entry === "string" &&
      propertyNames.includes(entry) &&
      !names.has(entry)

    if (!isKnownName) {
      return undefined
    }

    names.add(entry)
  }

  return names
}

function readField(
  name: string,
  node: unknown,
  required: boolean
): SchemaField | undefined {
  if (!isRecord(node)) {
    return undefined
  }

  if (node.type === "object") {
    const fields = readObjectFields(node)

    return fields === undefined
      ? undefined
      : createField({ name, type: "object", required, fields })
  }

  if (node.type === "array") {
    return readArrayField(name, node, required)
  }

  return isPrimitiveType(node.type) && hasOnlyKeys(node, ["type"])
    ? createField({ name, type: node.type, required })
    : undefined
}

function readArrayField(
  name: string,
  node: Record<string, unknown>,
  required: boolean
): SchemaField | undefined {
  if (!hasOnlyKeys(node, ["type", "items"]) || !isRecord(node.items)) {
    return undefined
  }

  const items = node.items

  if (items.type === "object") {
    const fields = readObjectFields(items)

    return fields === undefined
      ? undefined
      : createField({
          name,
          type: "array",
          itemType: "object",
          required,
          fields,
        })
  }

  return isPrimitiveType(items.type) && hasOnlyKeys(items, ["type"])
    ? createField({ name, type: "array", itemType: items.type, required })
    : undefined
}

function isPrimitiveType(
  value: unknown
): value is Exclude<FieldItemType, "object"> {
  return typeof value === "string" && primitiveTypes.has(value)
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: string[]) {
  return Object.keys(record).every((key) => allowed.includes(key))
}
