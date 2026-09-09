// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { type ActionCtx } from "../_generated/server"
import schema from "../schema"
import { loadRuntime } from "./context"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

test.each([
  "queued",
  "running",
  "completed",
  "failed",
  "stopped",
] as const)("loads a %s run with its retained sandbox", async (status) => {
  const t = convexTest(schema, modules)
  const terminal = ["completed", "failed", "stopped"].includes(status)
  const runId = await t.run(async (ctx) => {
    const runId = await ctx.db.insert("runs", {
      organizationId: "organization",
      audience: "organization",
      principal: { kind: "organization" },
      cause: { type: "manual" },
      instructions: "Summarize the meeting.",
      snapshot: { title: "Meeting", source: { type: "manual" }, context: [] },
      status,
      createdAt: 0,
    })
    await ctx.db.insert("sandboxes", {
      organizationId: "organization",
      runId,
      externalId: "sandbox",
      status: terminal ? "idle" : "active",
      createdAt: 0,
      updatedAt: 0,
    })
    return runId
  })
  const ctx = { runQuery: t.query, runMutation: t.mutation } as ActionCtx

  const loaded = await loadRuntime(ctx, runId)

  expect(loaded.input.run.status).toBe(status)
  expect(loaded.context.run).toEqual({
    id: runId,
    organizationId: "organization",
    rootId: null,
    sandboxId: "sandbox",
    status,
  })
  expect(loaded.session).toBeNull()

  await t.run(async (ctx) => {
    await ctx.db.patch(runId, { instructions: undefined })
  })
  await expect(loadRuntime(ctx, runId)).rejects.toThrow(
    "Runtime context not found."
  )
  await t.run(async (ctx) => {
    await ctx.db.delete(runId)
  })
  await expect(loadRuntime(ctx, runId)).rejects.toThrow(
    "Runtime context not found."
  )
})
