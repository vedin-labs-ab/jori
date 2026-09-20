import { type JsonSchemaObject } from "../schema/types"
import { type TableColumn, type TableColumnType } from "./columns"

// Columns are the table-native way to author a schema; documents are
// validated against JSON Schema. This is the mechanical bridge: each column
// becomes a property keyed by its hidden id, required columns become
// `required`, and unknown keys are rejected via
// `additionalProperties: false`.

const columnTypeSchemas: Record<TableColumnType, JsonSchemaObject> = {
  boolean: { type: "boolean" },
  float: { type: "number" },
  integer: { type: "integer" },
  string: { type: "string" },
}

/** Compile a table's columns to the JSON Schema its rows validate against. */
export function compileTableSchema(columns: TableColumn[]): JsonSchemaObject {
  const required = columns
    .filter((column) => column.required === true)
    .map((column) => column.id)

  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      columns.map((column) => [column.id, columnTypeSchemas[column.type]])
    ),
    ...(required.length > 0 ? { required } : {}),
  }
}
