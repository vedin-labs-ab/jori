import { shareExpiry } from "../../../../../../contracts/shares/expiry"
import {
  numberProperty,
  objectSchema,
  stringProperty,
} from "../fragments/common"

const tableVisibilityProperty = {
  type: "string",
  enum: ["private", "organization"],
  description:
    "Private tables are owner-only. Organization tables are visible to organization members. Defaults to organization.",
}

const tableIdProperty = stringProperty("Jori table ID.")
const rowIdProperty = stringProperty("Row ID from insert or list results.")
const rowVersionProperty = numberProperty(
  "Optional optimistic concurrency version from a previous read of the row.",
  0
)

const tableColumnInput = objectSchema({
  required: ["name", "type"],
  properties: {
    name: stringProperty(
      "Column name — the header users see and the key row values use. Unique within the table, ignoring case."
    ),
    type: {
      type: "string",
      enum: ["string", "float", "integer", "boolean"],
      description:
        "Value type enforced on every row write; fixed once the column exists.",
    },
    required: {
      type: "boolean",
      description:
        "Require a value in every row. Only satisfiable while the table has no rows, or when every row already holds a value.",
    },
  },
})

const rowValuesProperty = {
  type: "object",
  additionalProperties: true,
  description:
    "Row values keyed by column name, matching the table's column types.",
}

export const tableToolInputSchemas = {
  search_tables: objectSchema({
    properties: {
      query: stringProperty("Substring matched against table names."),
      includeArchived: {
        type: "boolean",
        description: "Also return archived tables.",
      },
      limit: numberProperty("Maximum tables to return.", 1, 100),
    },
  }),
  create_table: objectSchema({
    required: ["name"],
    properties: {
      name: stringProperty("Short table name."),
      visibility: tableVisibilityProperty,
      columns: {
        type: "array",
        items: tableColumnInput,
        description:
          "Starting columns; a table may also start empty and grow columns later in the console.",
      },
    },
  }),
  read_table: objectSchema({
    required: ["tableId"],
    properties: {
      tableId: tableIdProperty,
    },
  }),
  list_table_rows: objectSchema({
    required: ["tableId"],
    properties: {
      tableId: tableIdProperty,
      limit: numberProperty("Maximum rows per page.", 1, 200),
      cursor: stringProperty(
        "continueCursor from the previous page to fetch the next one."
      ),
    },
  }),
  insert_table_row: objectSchema({
    required: ["tableId", "values"],
    properties: {
      tableId: tableIdProperty,
      values: rowValuesProperty,
    },
  }),
  update_table_row: objectSchema({
    required: ["tableId", "rowId", "values"],
    properties: {
      tableId: tableIdProperty,
      rowId: rowIdProperty,
      values: {
        ...rowValuesProperty,
        description:
          "Columns to change, keyed by column name: each entry replaces that column's value, null clears an optional column, omitted columns keep their value.",
      },
      expectedVersion: rowVersionProperty,
    },
  }),
  delete_table_row: objectSchema({
    required: ["tableId", "rowId"],
    properties: {
      tableId: tableIdProperty,
      rowId: rowIdProperty,
      expectedVersion: rowVersionProperty,
    },
  }),
  share_table: objectSchema({
    required: ["tableId"],
    properties: {
      tableId: tableIdProperty,
      expiresInHours: numberProperty(
        "How long the link stays valid, in hours. Defaults to 72. Match the content's shelf life.",
        shareExpiry.minHours,
        shareExpiry.maxHours
      ),
    },
  }),
}
