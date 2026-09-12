import { expect, test } from "vitest"
import { getToolInputSchema } from "../../../contracts/tools"
import { schemaViolations } from "../../../test/convex/schema"
import { normalizeBrokerToolInput } from "."

const schema = getToolInputSchema("search_runs")
const paginated = [
  { mode: "search" },
  { mode: "children", parentId: "parent" },
  { mode: "tree", rootId: "root" },
]

test.each([
  { mode: "ids", runIds: ["run_1"] },
  ...paginated,
  ...paginated.flatMap((mode) =>
    [1, 50].map((limit) => ({
      ...mode,
      query: "prior context",
      cursor: "next",
      limit,
    }))
  ),
])("accepts run search input %j in both wire and broker contracts", (input) => {
  expect(schemaViolations(input, schema)).toEqual([])
  expect(normalizeBrokerToolInput("search_runs", input)).toEqual(input)
})

test.each([
  [{}, "mode is required"],
  [{ mode: "other" }, "mode must be one of"],
  [{ mode: "search", runIds: ["run_1"] }, "runIds is not supported"],
  [{ mode: "ids", runIds: [] }, "runIds must contain at least 1 item"],
  [
    { mode: "ids", runIds: ["run_1"], query: "query" },
    "query is not supported",
  ],
  [
    { mode: "ids", runIds: ["run_1"], cursor: "next" },
    "cursor is not supported",
  ],
  [{ mode: "ids", runIds: ["run_1"], limit: 1 }, "limit is not supported"],
  [{ mode: "children" }, "parentId is required"],
  [{ mode: "tree" }, "rootId is required"],
  ...paginated.flatMap((mode): [unknown, string][] => [
    [{ ...mode, cursor: 1 }, "cursor must be a string"],
    [{ ...mode, limit: 0 }, "limit must be at least 1"],
    [{ ...mode, limit: 51 }, "limit must be at most 50"],
  ]),
] as [unknown, string][])(
  "rejects run search input %j in both wire and broker contracts",
  (input, message) => {
    expect(schemaViolations(input, schema)).not.toEqual([])
    expect(() => normalizeBrokerToolInput("search_runs", input)).toThrow(
      message
    )
  }
)
