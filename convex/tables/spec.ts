import {
  assertColumnEvolution,
  normalizeTableColumns,
  readStoredColumns,
  tableLimits,
} from "../../contracts/tables/columns"
import { compileTableSchema } from "../../contracts/tables/compile"
import { type KindSpec } from "../collections/spec"

/** A table is a collection of many documents (rows) whose schema is
 *  authored as typed columns. Columns rename freely and come and go like
 *  CSV headers; only a column's type is fixed for life. The data-dependent
 *  rules — required toggles and removal scrubs — live in tables/records. */
export const tableSpec: KindSpec<"table"> = {
  kind: "table",
  label: "Table",
  singleton: false,
  maxDocumentBytes: tableLimits.maxRowBytes,
  normalize: (input) => ({
    kind: "table",
    columns: normalizeTableColumns(input),
  }),
  evolve: (current, next) => {
    const columns = normalizeTableColumns(next)

    assertColumnEvolution(readStoredColumns(current.columns), columns)

    return { kind: "table", columns }
  },
  compile: (authoring) =>
    compileTableSchema(readStoredColumns(authoring.columns)),
  documentLabel: () => "Row",
}
