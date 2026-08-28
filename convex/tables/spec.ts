import {
  assertColumnEvolution,
  normalizeTableColumns,
  tableLimits,
} from "../../contracts/tables/columns"
import { compileTableSchema } from "../../contracts/tables/compile"
import { type KindSpec } from "../collections/spec"

/** A table is a collection of many documents (rows) whose schema is
 *  authored as typed columns and evolved additively. */
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

    assertColumnEvolution(current.columns, columns)

    return { kind: "table", columns }
  },
  compile: (authoring) => compileTableSchema(authoring.columns),
  documentLabel: () => "Row",
}
