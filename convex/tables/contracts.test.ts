import { expect, test } from "vitest"
import { tableToolResponseSchemas } from "../../contracts/tools/responses/jori/tables"
import { type Visibility } from "../../contracts/visibility"
import { id } from "../../test/convex/database"
import { tableDoc } from "../../test/convex/materials/collections"
import { schemaViolations } from "../../test/convex/schema"
import { agentTableSummary, summarizeTable } from "./access"

test.each<Visibility>([
  { mode: "organization" },
  { mode: "private" },
  { mode: "people", personIds: ["person"] },
  { mode: "teams", teamIds: ["team"] },
])(
  "table summaries match response contracts for $mode visibility",
  (visibility) => {
    const table = {
      ...tableDoc(),
      _id: id<"collections">("table"),
      _creationTime: 1,
      folderId: id<"folders">("folder"),
      columns: [{ id: "title", name: "Title", type: "string" as const }],
      visibility: visibility as Parameters<
        typeof summarizeTable
      >[0]["visibility"],
      kind: "table" as const,
    }
    // Convex omits absent fields on the query/mutation response boundary.
    const result = JSON.parse(
      JSON.stringify(agentTableSummary(summarizeTable(table)))
    )
    expect(result.columns[0]).not.toHaveProperty("id")
    expect(result.rowCount).toBe(0)
    expect(
      schemaViolations(result, tableToolResponseSchemas.create_table)
    ).toEqual([])
    expect(
      schemaViolations(result, tableToolResponseSchemas.read_table)
    ).toEqual([])
    expect(
      schemaViolations([result], tableToolResponseSchemas.search_tables)
    ).toEqual([])
  }
)
