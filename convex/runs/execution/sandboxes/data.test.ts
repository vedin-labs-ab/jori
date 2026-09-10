import { expect, test, vi } from "vitest"
import { databaseContext, id } from "../../../../test/convex/database"
import { type Doc } from "../../../_generated/dataModel"
import { reserveSandboxCleanup } from "./cleanup"
import {
  claimReusableSandbox,
  findSandboxByExternalId,
  releaseIdleSandbox,
  settleRunSandbox,
  upsertSandbox,
} from "./data"

test("releases and claims idle sandboxes within the same session", async () => {
  const { ctx, database, runAfter, runAt } = sandboxContext()
  await database.insert("runs", run("run-1", "running"))
  const sessionId = await database.insert(
    "sessions",
    session("run-1", "conversation-1")
  )
  const target = {
    externalId: "sandbox-external",
    runId: id<"runs">("run-1"),
  }

  await upsertSandbox(ctx, target)

  expect(await findSandboxByExternalId(ctx, target.externalId)).toMatchObject({
    ...target,
    status: "active",
    sessionId,
  })

  const lease = await releaseIdleSandbox(ctx, target)

  expect(lease?.expiresAt).toBeGreaterThan(Date.now())
  expect(await findSandboxByExternalId(ctx, target.externalId)).toMatchObject({
    status: "idle",
    sessionId,
  })
  expect(runAt).toHaveBeenCalledExactlyOnceWith(
    lease?.expiresAt,
    expect.anything(),
    { ...target, expiresAt: lease?.expiresAt }
  )
  expect(runAfter).not.toHaveBeenCalled()

  await database.insert("runs", run("run-2", "running"))
  await database.patch(sessionId, { runId: id<"runs">("run-2") })

  await expect(claimReusableSandbox(ctx, id<"runs">("run-2"))).resolves.toEqual(
    { externalId: "sandbox-external" }
  )
  const reclaimed = await findSandboxByExternalId(ctx, target.externalId)
  expect(reclaimed).toMatchObject({ runId: "run-2", status: "active" })
  expect(reclaimed).not.toHaveProperty("expiresAt")
})

test("expired cleanup only reserves matching idle leases", async () => {
  const expiresAt = Date.now() - 1
  const { ctx, database } = sandboxContext()
  const sandboxId = await database.insert(
    "sandboxes",
    sandbox({ expiresAt, runId: "run-1", status: "idle" })
  )
  const target = {
    externalId: "sandbox-external",
    runId: id<"runs">("run-1"),
  }

  await expect(
    reserveSandboxCleanup(ctx, { ...target, expiresAt: expiresAt + 1 })
  ).resolves.toBe(false)
  expect(await database.get(sandboxId)).toMatchObject({ status: "idle" })

  await expect(
    reserveSandboxCleanup(ctx, { ...target, expiresAt })
  ).resolves.toBe(true)
  const reserved = await database.get(sandboxId)
  expect(reserved).toMatchObject({ status: "cleaning" })
  expect(reserved?.expiresAt).toBeGreaterThan(Date.now())
})

test("a failed run's sandbox is killed rather than left idle", async () => {
  const { ctx, database, runAfter, runAt } = sandboxContext()
  const failed = run("run-1", "failed")
  await database.insert("runs", failed)
  const sandboxId = await database.insert(
    "sandboxes",
    sandbox({ runId: failed._id, status: "active" })
  )

  await expect(settleRunSandbox(ctx, failed as Doc<"runs">)).resolves.toBeNull()

  expect(runAfter).toHaveBeenCalledExactlyOnceWith(0, expect.anything(), {
    externalId: "sandbox-external",
    runId: failed._id,
  })
  expect(runAt).not.toHaveBeenCalled()
  expect(await database.get(sandboxId)).toMatchObject({ status: "active" })
})

function sandboxContext() {
  const runAfter = vi.fn()
  const runAt = vi.fn()

  return {
    ...databaseContext({ scheduler: { runAfter, runAt } }),
    runAfter,
    runAt,
  }
}

function run(idValue: string, status: "failed" | "running") {
  return {
    _id: id<"runs">(idValue),
    _creationTime: 0,
    organizationId: "organization",
    status,
  }
}

function session(runId: string, conversationId: string) {
  return {
    runId: id<"runs">(runId),
    updatedAt: 0,
    conversationId: id<"conversations">(conversationId),
  }
}

function sandbox(overrides: Record<string, unknown>) {
  return {
    organizationId: "organization",
    externalId: "sandbox-external",
    createdAt: 0,
    updatedAt: 0,
    sessionId: id<"sessions">("session-1"),
    ...overrides,
  }
}
