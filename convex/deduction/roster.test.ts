import { expect, test, vi } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type ActionCtx, type QueryCtx } from "../_generated/server"
import { readWorkstreams } from "../workstreams/agent"
import { callWorkstreamTool } from "../workstreams/mcp"
import { readWorkstreamRoster } from "./roster"

const handler = (
  readWorkstreams as unknown as {
    _handler: (
      ctx: QueryCtx,
      args: { organizationId: string }
    ) => Promise<{
      workstreams: unknown[]
    }>
  }
)._handler

test("paused workstream history stays stored but leaves agent context and tool reads", async () => {
  const { ctx, database } = databaseContext()
  const beliefId = await database.insert("beliefs", {
    organizationId: "organization-1",
    kind: "workstream",
    name: "Historical work",
    brief: "An old inference must not ground new runs.",
    status: "confirmed",
    seenAt: Date.now(),
    createdAt: Date.now(),
  })
  const before = await database.get(beliefId)

  expect(await readWorkstreamRoster(ctx, "organization-1")).toEqual([])
  expect(
    await handler(ctx, { organizationId: "organization-1" })
  ).toMatchObject({
    workstreams: [],
  })
  expect(await database.get(beliefId)).toEqual(before)
})

test("a queued workstream tool call reports the pause without reading stale data", async () => {
  const runQuery = vi.fn()

  await expect(
    callWorkstreamTool(
      { runQuery } as unknown as ActionCtx,
      { organizationId: "organization-1" },
      { tool: "read_workstreams", args: {} }
    )
  ).rejects.toThrow("Workstreams are paused")
  expect(runQuery).not.toHaveBeenCalled()
})
