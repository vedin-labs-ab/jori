import { describe, expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { callJoriTableTool } from "./mcp"

const execution = {
  organizationId: "organization",
  createdBy: "person" as Id<"persons">,
}

describe("table tool dispatch", () => {
  test("create leaves visibility to the execution defaults and passes columns through", async () => {
    const columns = [{ name: "Title", type: "string", required: true }]
    const runMutation = vi.fn(async () => ({
      columns: columns.map((column) => ({ ...column, id: "internal-column" })),
    }))

    const result = await callJoriTableTool(
      { runMutation } as unknown as ActionCtx,
      execution,
      { tool: "create_table", args: { name: "Leads", columns } }
    )

    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      personId: "person",
      name: "Leads",
      visibility: undefined,
      columns,
    })
    expect(result).toEqual({ columns })
  })

  test("row listing maps limit and cursor to pagination options", async () => {
    const runQuery = vi.fn(async () => ({
      rows: [],
      isDone: true,
      continueCursor: "",
    }))

    await callJoriTableTool({ runQuery } as unknown as ActionCtx, execution, {
      tool: "list_table_rows",
      args: { tableId: "table", limit: 10, cursor: "next" },
    })

    expect(runQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tableId: "table",
        paginationOpts: { numItems: 10, cursor: "next" },
        keyedBy: "name",
      })
    )
  })
})

describe("table row dispatch", () => {
  test("row updates route through the broker with their version", async () => {
    const runMutation = vi.fn(async () => ({}))

    await callJoriTool(
      { runMutation } as unknown as ActionCtx,
      {
        organizationId: "organization",
        principal: { kind: "person", personId: "person" as Id<"persons"> },
      },
      {
        tool: "update_table_row",
        args: {
          tableId: "table",
          rowId: "row",
          values: { Title: "Renamed" },
          expectedVersion: 2,
        },
      }
    )

    // Values are keyed by column NAME on the agent surface; the mutation
    // resolves them to hidden column ids in-transaction.
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      personId: "person",
      tableId: "table",
      rowId: "row",
      values: { Title: "Renamed" },
      expectedVersion: 2,
      keyedBy: "name",
    })
  })

  test("row deletion requires a rowId", async () => {
    await expect(
      callJoriTableTool(
        { runMutation: vi.fn() } as unknown as ActionCtx,
        execution,
        { tool: "delete_table_row", args: { tableId: "table" } }
      )
    ).rejects.toThrow("rowId is required")
  })

  test("workspace executions pass their trusted run without a personal identity", async () => {
    const runQuery = vi.fn(async () => null)
    await callJoriTableTool(
      { runQuery } as unknown as ActionCtx,
      { organizationId: "organization", runId: "runs_shared" as Id<"runs"> },
      { tool: "read_table", args: { tableId: "table" } }
    )
    expect(runQuery).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      runId: "runs_shared",
      personId: undefined,
      tableId: "table",
    })
  })

  test("share_table mints a link with the requested expiry", async () => {
    const runMutation = vi.fn(async () => ({ url: "u", expiresAt: 1 }))

    await callJoriTableTool(
      { runMutation } as unknown as ActionCtx,
      execution,
      { tool: "share_table", args: { tableId: "table", expiresInHours: 24 } }
    )

    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      personId: "person",
      tableId: "table",
      expiresInHours: 24,
    })
  })
})
