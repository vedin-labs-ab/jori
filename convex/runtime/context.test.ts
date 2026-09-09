// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../_generated/api"
import { type ActionCtx, type MutationCtx } from "../_generated/server"
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

test.each([
  "job",
  "instruction",
] as const)("limits %s requester accounts to the run's integration grants", async (type) => {
  const t = convexTest(schema, modules)
  const { runId, integrationIds } = await t.run((ctx) =>
    seedRequesterRun(ctx, type)
  )

  const input = await t.query(internal.runs.records.getInputByRun, { runId })

  expect(input).toMatchObject({
    type,
    instructions: "Review the changes.",
    timezone: "Europe/Stockholm",
    requester: {
      accounts: [
        {
          integration: "github",
          name: "granted",
          email: "granted@example.com",
        },
      ],
      emails: ["granted@example.com"],
    },
  })
  expect(input?.integrations.map((integration) => integration._id)).toEqual([
    integrationIds[0],
  ])

  await t.run(async (ctx) => {
    await ctx.db.patch(runId, { access: undefined })
  })
  const withoutAccess = await t.query(internal.runs.records.getInputByRun, {
    runId,
  })

  if (type === "job") {
    expect(withoutAccess).toBeNull()
  } else {
    expect(
      withoutAccess?.integrations.map((integration) => integration._id)
    ).toEqual(integrationIds)
    expect(
      withoutAccess?.requester?.accounts.map((account) => account.name)
    ).toEqual(["granted", "ungranted"])
  }
})

async function seedRequesterRun(ctx: MutationCtx, type: "job" | "instruction") {
  const personId = await ctx.db.insert("persons", {
    organizationId: "organization",
    timezone: "Europe/Stockholm",
    createdAt: 0,
    updatedAt: 0,
  })
  const integrationIds = await Promise.all(
    ["granted", "ungranted"].map((name) =>
      ctx.db.insert("integrations", {
        organizationId: "organization",
        integration: "github",
        scope: "user",
        ownerId: personId,
        externalId: name,
        name,
        email: `${name}@example.com`,
        credentials: {},
        status: "active",
        createdBy: personId,
        createdAt: 0,
        updatedAt: 0,
      })
    )
  )
  const access = {
    integrations: [{ id: integrationIds[0], tools: ["github_get_me"] }],
    web: false,
  }
  const principal = { kind: "person" as const, personId }
  const jobId = await ctx.db.insert("jobs", {
    organizationId: "organization",
    name: "Review",
    instructions: "Review the changes.",
    visibility: { mode: "organization" },
    principal,
    type: "once",
    access,
    trigger: { at: 0 },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  })
  const runId = await ctx.db.insert("runs", {
    organizationId: "organization",
    audience: "person",
    principal,
    cause: { type: "manual" },
    ...(type === "job" ? { job: { id: jobId } } : {}),
    access,
    instructions: "  Review the changes.  ",
    snapshot: { title: "Review", source: { type: "manual" }, context: [] },
    status: "running",
    createdAt: 0,
  })
  return { runId, integrationIds }
}
