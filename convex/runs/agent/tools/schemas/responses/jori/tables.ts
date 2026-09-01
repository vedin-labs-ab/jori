import {
  arrayProperty,
  booleanProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../common"

function tableSummaryProperties() {
  return {
    tableId: stringProperty("Jori table ID."),
    name: stringProperty("Table name."),
    description: stringProperty("Table description; absent when unset."),
    visibility: objectSchema({
      description:
        "Who may see it inside the organization: only its owner (private), listed people, listed teams, or every member.",
      properties: {
        mode: stringProperty("private, people, teams, or organization."),
      },
    }),
    ownerId: stringProperty("Owning person ID."),
    columns: arrayProperty(
      "Column schema every row is validated against; row values are keyed by column name.",
      objectSchema({
        properties: {
          name: stringProperty("Column name, unique within the table."),
          type: stringProperty("string, float, integer, or boolean."),
          required: booleanProperty("Whether every row needs a value."),
        },
      })
    ),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    updatedAt: numberProperty("Last update time in epoch milliseconds."),
    archivedAt: numberProperty("Archive time; absent while active."),
  }
}

function rowSummary(description: string): JsonSchema {
  return objectSchema({
    description,
    properties: {
      rowId: stringProperty("Row ID."),
      values: {
        type: "object",
        additionalProperties: true,
        description: "Row values keyed by column name.",
      },
      version: numberProperty("Row version, incremented per update."),
      createdAt: numberProperty("Insert time in epoch milliseconds."),
      updatedAt: numberProperty("Last write time in epoch milliseconds."),
    },
  })
}

export const tableToolResponseSchemas = {
  search_tables: arrayProperty(
    "Accessible tables matching the query, most recently updated first.",
    objectSchema({
      description: "Compact table summary.",
      properties: tableSummaryProperties(),
    })
  ),
  create_table: objectSchema({
    description: "The created table.",
    properties: tableSummaryProperties(),
  }),
  read_table: {
    type: ["object", "null"],
    additionalProperties: false,
    description: "The table with its column schema; null when not found.",
    properties: tableSummaryProperties(),
  },
  list_table_rows: objectSchema({
    description: "One page of rows, newest first.",
    required: ["rows", "isDone", "continueCursor"],
    properties: {
      rows: arrayProperty("Rows in this page.", rowSummary("One row.")),
      isDone: booleanProperty("True when this is the last page."),
      continueCursor: stringProperty("Cursor for the next page."),
    },
  }),
  insert_table_row: rowSummary("The inserted row."),
  update_table_row: rowSummary("The row after the update."),
  delete_table_row: objectSchema({
    required: ["rowId", "deleted"],
    properties: {
      rowId: stringProperty("Deleted row ID."),
      deleted: { type: "boolean", const: true },
    },
  }),
  share_table: objectSchema({
    required: ["url", "expiresAt"],
    properties: {
      url: stringProperty("View-only share link."),
      expiresAt: numberProperty("Expiry time in epoch milliseconds."),
    },
  }),
} satisfies SchemaMap
