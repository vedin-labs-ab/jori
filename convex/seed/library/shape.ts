import { type JsonSchemaObject } from "../../../contracts/schema/validate"
import { type TableColumnType } from "../../../contracts/tables/columns"

// What a seeded collection looks like before it is written. Tables author
// their columns the way a person would type them and carry rows positionally,
// so a fixture reads as the grid it becomes; stores carry one JSON value and
// the schema it is held to.

export type SeedColumn = [name: string, type: TableColumnType]

type SeedCollection = {
  name: string
  description: string
  /** The folder it is filed in, by name. */
  folder: string
  /** Days before the seed instant it was made and last written. */
  created: number
  updated: number
  /** Who keeps it, by the local part of their address. */
  owner: string
}

export type SeedTable = SeedCollection & {
  columns: SeedColumn[]
  rows: (string | number | boolean)[][]
}

export type SeedStore = SeedCollection & {
  /** Absent means the store accepts any JSON object. */
  schema?: JsonSchemaObject
  value: Record<string, unknown>
}
