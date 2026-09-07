import { afterEach, expect, test, vi } from "vitest"
import { id } from "../../../../test/convex/database"
import { type MutationCtx } from "../../../_generated/server"
import { markSandboxCleaned, reserveSandboxCleanup } from "./cleanup"

afterEach(() => vi.restoreAllMocks())

const target = { externalId: "sandbox-test", runId: id<"runs">("run-test") }

function fixture(status = "active") {
  const row: Record<string, unknown> = {
    _id: id<"sandboxes">("sandbox-row"),
    ...target,
    status,
  }
  const runAt = vi.fn().mockResolvedValue(undefined)
  const ctx = {
    db: {
      query: () => ({ withIndex: () => ({ first: async () => row }) }),
      patch: async (_id: unknown, patch: Record<string, unknown>) => {
        Object.assign(row, patch)
      },
    },
    scheduler: { runAt },
  } as unknown as MutationCtx
  return { ctx, row, runAt }
}

test("cleanup has a durable watchdog and cannot be reserved twice", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1000)
  const { ctx, row, runAt } = fixture()
  expect(await reserveSandboxCleanup(ctx, target)).toBe(true)
  expect(row).toMatchObject({ status: "cleaning", expiresAt: 121000 })
  expect(runAt).toHaveBeenCalledWith(121000, expect.anything(), target)
  expect(await reserveSandboxCleanup(ctx, target)).toBe(false)
  expect(runAt).toHaveBeenCalledTimes(1)
})

test.each([
  "failed",
  "cleaning",
])("watchdog retries %s cleanup after its lease", async (status) => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(1000)
  const { ctx, row, runAt } = fixture()
  await reserveSandboxCleanup(ctx, target)
  if (status === "failed") {
    await markSandboxCleaned(ctx, {
      externalId: target.externalId,
      error: "Safe failure",
    })
  }
  expect(row.status).toBe(status)
  expect(await reserveSandboxCleanup(ctx, target)).toBe(false)
  clock.mockReturnValue(121000)
  expect(await reserveSandboxCleanup(ctx, target)).toBe(true)
  expect(row.status).toBe("cleaning")
  expect(runAt).toHaveBeenCalledTimes(2)
})

test("only confirmed deletion marks cleanup complete and stops retries", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1000)
  const { ctx, row } = fixture()
  await reserveSandboxCleanup(ctx, target)
  await markSandboxCleaned(ctx, { externalId: target.externalId })
  expect(row).toMatchObject({ status: "cleaned", expiresAt: undefined })
  expect(await reserveSandboxCleanup(ctx, target)).toBe(false)
  await markSandboxCleaned(ctx, {
    externalId: target.externalId,
    error: "Stale failure",
  })
  expect(row.status).toBe("cleaned")
})

test("stale idle expiry and another run cannot reserve cleanup", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1000)
  const { ctx, row, runAt } = fixture("idle")
  row.expiresAt = 900
  expect(await reserveSandboxCleanup(ctx, target)).toBe(false)
  expect(await reserveSandboxCleanup(ctx, { ...target, expiresAt: 800 })).toBe(
    false
  )
  expect(
    await reserveSandboxCleanup(ctx, {
      ...target,
      expiresAt: 900,
      runId: id<"runs">("another-run"),
    })
  ).toBe(false)
  expect(runAt).not.toHaveBeenCalled()
  expect(await reserveSandboxCleanup(ctx, { ...target, expiresAt: 900 })).toBe(
    true
  )
})
