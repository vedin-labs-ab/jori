import { afterEach, expect, test, vi } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { type ActionCtx, type MutationCtx } from "../../_generated/server"
import { type PassScope, type PassStage } from "../schema"
import { open, run, sweep } from "./pass"

vi.mock("./judge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./judge")>()),
  requestJudge: vi.fn(),
}))

const sweepHandler = (
  sweep as unknown as { _handler: (ctx: MutationCtx) => Promise<void> }
)._handler
const runHandler = (
  run as unknown as {
    _handler: (
      ctx: ActionCtx,
      args: { organizationId: string; force?: boolean }
    ) => Promise<void>
  }
)._handler
const openHandler = (
  open as unknown as {
    _handler: (
      ctx: MutationCtx,
      args: {
        organizationId: string
        stage: PassStage
        scope: PassScope
        force?: boolean
      }
    ) => Promise<unknown>
  }
)._handler

afterEach(() => vi.clearAllMocks())

test("a queued deduction sweep schedules nothing even with active integrations", async () => {
  const runAfter = vi.fn()
  const { ctx, database } = databaseContext({ scheduler: { runAfter } })
  await database.insert("integrations", {
    organizationId: "organization-1",
    integration: "github",
    status: "active",
  })

  await sweepHandler(ctx)

  expect(runAfter).not.toHaveBeenCalled()
})

test.each([false, true])(
  "a queued or forced pass makes no model or context calls, force=%s",
  async (force) => {
    const { requestJudge } = await import("./judge")
    const runMutation = vi.fn()
    const runQuery = vi.fn()
    const ctx = { runMutation, runQuery } as unknown as ActionCtx

    await runHandler(ctx, { organizationId: "organization-1", force })

    expect(runMutation).not.toHaveBeenCalled()
    expect(runQuery).not.toHaveBeenCalled()
    expect(requestJudge).not.toHaveBeenCalled()
  }
)

test.each([
  ["effort", "window"],
  ["workstream", "window"],
  ["workstream", "full"],
] as const)(
  "the paused opener cannot restart %s/%s or change history",
  async (stage, scope) => {
    const { ctx, database } = databaseContext()
    const passId = await database.insert("passes", {
      organizationId: "organization-1",
      stage,
      scope,
      status: "running",
      startedAt: 0,
      window: { start: 0, end: 1 },
    })
    const before = await database.get(passId)

    await expect(
      openHandler(ctx, {
        organizationId: "organization-1",
        stage,
        scope,
        force: true,
      })
    ).resolves.toBeNull()

    expect(await database.get(passId)).toEqual(before)
    expect(await database.query("passes").collect()).toHaveLength(1)
  }
)
