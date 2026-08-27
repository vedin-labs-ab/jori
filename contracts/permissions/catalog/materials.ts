import { type ToolPermissionRow } from "../types"

// Workspace materials: data both Jori and people read and edit under the
// same permissions. Tables hold typed rows; stores hold one schema-backed
// JSON document each; files hold uploaded and generated blobs. Sharing a
// material mints a read-only link that works without signing in.

export const materialToolPermissionRows = [
  // Tables
  [
    "jori",
    "search_tables",
    "Search tables",
    "Find existing Jori tables.",
    "Find Jori tables by name. Use to locate a table before reading or writing rows, and to check for an existing table before creating a duplicate.",
    "read",
  ],
  [
    "jori",
    "read_table",
    "Read table",
    "Read a table's column schema.",
    "Inspect a table's columns and metadata. Use before inserting or updating rows so values match the column types.",
    "read",
  ],
  [
    "jori",
    "list_table_rows",
    "List table rows",
    "Read the rows stored in a table.",
    "Page through a table's rows, newest first. Use limit and cursor instead of assuming one page holds everything.",
    "read",
  ],
  [
    "jori",
    "create_table",
    "Create table",
    "Create a table with typed columns.",
    "Create a table whose rows are validated against typed columns (string, number, integer, boolean, json). Search first to avoid duplicates; columns are fixed apart from adding optional ones later. Tables belong to the organization unless made personal.",
    "write",
  ],
  [
    "jori",
    "insert_table_row",
    "Insert table row",
    "Add a row to a table.",
    "Insert one row with values keyed by column key. Values must match the table's column types; required columns cannot be omitted.",
    "write",
  ],
  [
    "jori",
    "update_table_row",
    "Update table row",
    "Change a row in a table.",
    "Update named columns of one row: each entry replaces that column's value, null clears an optional column, omitted columns keep their value. Pass expectedVersion from a previous read to fail cleanly on concurrent edits.",
    "write",
  ],
  [
    "jori",
    "delete_table_row",
    "Delete table row",
    "Remove a row from a table.",
    "Delete one row by ID. Confirm intent when the requester did not name the row.",
    "write",
  ],
  [
    "jori",
    "share_table",
    "Share table",
    "Create a time-limited link that lets anyone view a table.",
    "Mint a read-only link for a table that works without signing in to Jori. Use when delivering table contents to people who may lack Jori access, and include the returned url in your message. Each call creates an independent link with its own expiry; earlier links keep working until they expire.",
    "write",
  ],
  // Stores
  [
    "jori",
    "search_stores",
    "Search stores",
    "Find existing Jori stores.",
    "Find Jori stores by name. Use to locate a store before reading or writing it, and to check for an existing store before creating a duplicate.",
    "read",
  ],
  [
    "jori",
    "read_store",
    "Read store",
    "Read a store's document and schema.",
    "Read a store's JSON document with its schema and version. Use before writing so merge patches and expectedVersion are grounded in the current value.",
    "read",
  ],
  [
    "jori",
    "create_store",
    "Create store",
    "Create a schema-backed JSON store.",
    "Create a store: one JSON document validated against a required JSON Schema on every write. Search first to avoid duplicates; the schema is fixed at creation. Stores belong to the organization unless made personal.",
    "write",
  ],
  [
    "jori",
    "write_store",
    "Write store",
    "Write data into a store's document.",
    "Replace, merge-patch, or claim into a store's document; writes must match the store schema and stay within the 256 KiB value cap. A claim atomically sets a path only when it is still unset — claim before at-most-once actions like sending. Pass expectedVersion from a previous read to fail cleanly on concurrent writes.",
    "write",
  ],
  [
    "jori",
    "share_store",
    "Share store",
    "Create a time-limited link that lets anyone view a store.",
    "Mint a read-only link for a store that works without signing in to Jori. Use when delivering a store's document to people who may lack Jori access, and include the returned url in your message. Each call creates an independent link with its own expiry; earlier links keep working until they expire.",
    "write",
  ],
  // Files
  [
    "jori",
    "share_file",
    "Share file",
    "Create a time-limited link that lets anyone view a file.",
    "Mint a read-only link for a saved file that works without signing in to Jori. Use when delivering a file to people who may lack Jori access, and include the returned url in your message. Each call creates an independent link with its own expiry; earlier links keep working until they expire.",
    "write",
  ],
] satisfies ToolPermissionRow[]
