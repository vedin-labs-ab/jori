import { describe, expect, test } from "vitest"
import { fieldsToSchema, schemaToFields } from "./convert"
import {
  collectFieldErrors,
  createField,
  fieldNameErrors,
  hasChildFields,
  type SchemaField,
} from "./model"

// Comparable shape: the model minus generated ids and parked child lists
// (children kept under a non-object field never reach the schema).
type FieldShape = {
  name: string
  type: SchemaField["type"]
  itemType: SchemaField["itemType"]
  required: boolean
  fields: FieldShape[]
}

function shapeOf(fields: SchemaField[]): FieldShape[] {
  return fields.map((field) => ({
    name: field.name,
    type: field.type,
    itemType: field.itemType,
    required: field.required,
    fields: hasChildFields(field) ? shapeOf(field.fields) : [],
  }))
}

const orderFields = [
  createField({ name: "status", required: true }),
  createField({ name: "amount", type: "number" }),
  createField({ name: "count", type: "integer", required: true }),
  createField({ name: "paid", type: "boolean" }),
  createField({
    name: "customer",
    type: "object",
    required: true,
    fields: [
      createField({ name: "email", required: true }),
      createField({
        name: "address",
        type: "object",
        fields: [createField({ name: "city" })],
      }),
    ],
  }),
  createField({ name: "tags", type: "array", itemType: "string" }),
  createField({
    name: "lines",
    type: "array",
    itemType: "object",
    required: true,
    fields: [
      createField({ name: "sku", required: true }),
      createField({ name: "quantity", type: "integer" }),
    ],
  }),
]

const orderSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    amount: { type: "number" },
    count: { type: "integer" },
    paid: { type: "boolean" },
    customer: {
      type: "object",
      properties: {
        email: { type: "string" },
        address: {
          type: "object",
          properties: { city: { type: "string" } },
        },
      },
      required: ["email"],
    },
    tags: { type: "array", items: { type: "string" } },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          quantity: { type: "integer" },
        },
        required: ["sku"],
      },
    },
  },
  required: ["status", "count", "customer", "lines"],
}

describe("fieldsToSchema", () => {
  test("emits nested objects, arrays, and required lists in field order", () => {
    expect(fieldsToSchema(orderFields)).toEqual(orderSchema)
  })

  test("an empty builder emits a bare object schema", () => {
    expect(fieldsToSchema([])).toEqual({ type: "object" })
  })

  test("omits required when no field is required", () => {
    const schema = fieldsToSchema([createField({ name: "note" })])

    expect(schema).toEqual({
      type: "object",
      properties: { note: { type: "string" } },
    })
  })

  test("children parked under a primitive field are not emitted", () => {
    const field = createField({
      name: "plain",
      type: "string",
      fields: [createField({ name: "leftover" })],
    })

    expect(fieldsToSchema([field])).toEqual({
      type: "object",
      properties: { plain: { type: "string" } },
    })
  })
})

const unrepresentable: [string, unknown][] = [
  ["non-object root", { type: "string" }],
  ["missing type", { properties: {} }],
  ["extra root keyword", { type: "object", additionalProperties: false }],
  ["root description", { type: "object", description: "notes" }],
  [
    "property with enum",
    {
      type: "object",
      properties: { status: { type: "string", enum: ["a", "b"] } },
    },
  ],
  [
    "bare const property",
    { type: "object", properties: { kind: { const: "invoice" } } },
  ],
  [
    "anyOf property",
    {
      type: "object",
      properties: { id: { anyOf: [{ type: "string" }] } },
    },
  ],
  [
    "null-typed property",
    { type: "object", properties: { gone: { type: "null" } } },
  ],
  [
    "string constraint",
    { type: "object", properties: { id: { type: "string", minLength: 1 } } },
  ],
  [
    "array without items",
    { type: "object", properties: { tags: { type: "array" } } },
  ],
  [
    "nested array items",
    {
      type: "object",
      properties: {
        grid: { type: "array", items: { type: "array", items: {} } },
      },
    },
  ],
  [
    "required name without a property",
    { type: "object", properties: {}, required: ["ghost"] },
  ],
  [
    "duplicate required name",
    {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id", "id"],
    },
  ],
  ["required without properties", { type: "object", required: [] }],
  ["non-record properties", { type: "object", properties: [] }],
  ["non-record property schema", { type: "object", properties: { id: true } }],
]

describe("schemaToFields", () => {
  test("loads the full supported shape with required propagation", () => {
    const fields = schemaToFields(orderSchema)

    expect(fields).toBeDefined()
    expect(shapeOf(fields ?? [])).toEqual(shapeOf(orderFields))
  })

  test("a bare object schema loads as an empty field list", () => {
    expect(schemaToFields({ type: "object" })).toEqual([])
  })

  test("empty properties load as an empty field list", () => {
    expect(schemaToFields({ type: "object", properties: {} })).toEqual([])
  })

  test.each(unrepresentable)("rejects %s", (_label, schema) => {
    expect(schemaToFields(schema)).toBeUndefined()
  })
})

describe("round trips", () => {
  test("form -> JSON -> form preserves the field model", () => {
    const fields = schemaToFields(fieldsToSchema(orderFields))

    expect(shapeOf(fields ?? [])).toEqual(shapeOf(orderFields))
  })

  test("JSON -> form -> JSON preserves the schema", () => {
    const fields = schemaToFields(orderSchema)

    expect(fieldsToSchema(fields ?? [])).toEqual(orderSchema)
  })
})

describe("collectFieldErrors", () => {
  test("flags unnamed and duplicate fields, including nested ones", () => {
    const unnamed = createField({ name: "  " })
    const first = createField({ name: "id" })
    const duplicate = createField({ name: "id", type: "number" })
    const nestedDuplicate = createField({ name: "city" })
    const parent = createField({
      name: "address",
      type: "object",
      fields: [createField({ name: "city" }), nestedDuplicate],
    })

    expect(collectFieldErrors([unnamed, first, duplicate, parent])).toEqual({
      [unnamed.id]: fieldNameErrors.missing,
      [duplicate.id]: fieldNameErrors.duplicate,
      [nestedDuplicate.id]: fieldNameErrors.duplicate,
    })
  })

  test("ignores children parked under a primitive field", () => {
    const field = createField({
      name: "plain",
      fields: [createField({ name: "" })],
    })

    expect(collectFieldErrors([field])).toEqual({})
  })

  test("sibling names may repeat across different nesting levels", () => {
    const fields = [
      createField({ name: "name" }),
      createField({
        name: "owner",
        type: "object",
        fields: [createField({ name: "name" })],
      }),
    ]

    expect(collectFieldErrors(fields)).toEqual({})
  })
})
