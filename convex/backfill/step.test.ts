import { expect, test, vi } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, type MutationCtx } from "../_generated/server"
import { start } from "./control"
import { fetchGitHubBackfillPage } from "./github"
import { fetchLinearBackfillPage } from "./linear"
import { step } from "./step"

vi.mock("./github", () => ({ fetchGitHubBackfillPage: vi.fn() }))
vi.mock("./linear", () => ({ fetchLinearBackfillPage: vi.fn() }))

const stepHandler = (
  step as unknown as {
    _handler: (
      ctx: ActionCtx,
      args: { backfillId: Id<"backfills"> }
    ) => Promise<void>
  }
)._handler
const startHandler = (
  start as unknown as {
    _handler: (
      ctx: MutationCtx,
      args: { organizationId: string }
    ) => Promise<{ started: string[] }>
  }
)._handler

test("a queued historical import stops before provider fetches or scheduling more work", async () => {
  const runAfter = vi.fn()
  const runQuery = vi.fn()
  const runMutation = vi.fn()

  await stepHandler(
    { runQuery, runMutation, scheduler: { runAfter } } as unknown as ActionCtx,
    {
      backfillId: "backfill-1" as Id<"backfills">,
    }
  )

  expect(runQuery).not.toHaveBeenCalled()
  expect(runMutation).not.toHaveBeenCalled()
  expect(runAfter).not.toHaveBeenCalled()
  expect(fetchGitHubBackfillPage).not.toHaveBeenCalled()
  expect(fetchLinearBackfillPage).not.toHaveBeenCalled()
})

test("operator bootstrap stays paused with active integrations and preserves import history", async () => {
  const runAfter = vi.fn()
  const { ctx, database } = databaseContext({ scheduler: { runAfter } })
  const integrationId = await database.insert("integrations", {
    organizationId: "organization-1",
    integration: "github",
    status: "active",
  })
  const backfillId = await database.insert("backfills", {
    organizationId: "organization-1",
    integrationId,
    status: "running",
    window: { start: 0, end: 1 },
  })
  await database.insert("integrations", {
    organizationId: "organization-1",
    integration: "linear",
    status: "active",
  })
  const before = await database.get(backfillId)

  await expect(
    startHandler(ctx, { organizationId: "organization-1" })
  ).resolves.toEqual({ started: [] })
  expect(runAfter).not.toHaveBeenCalled()
  expect(await database.query("backfills").collect()).toEqual([before])
})
