import { expect, test, vi } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { folderDoc } from "../../../test/convex/folders"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { pauseJob, resumeJob } from "./control"
import { createJob } from "./create"
import { updateJob } from "./write"

test.each([undefined, 1])(
  "rejects owned work from stale parent configuration %s",
  async (version) => {
    const parent = job({ version: 2 })
    const ctx = {
      db: { get: vi.fn(async () => parent) },
    } as unknown as MutationCtx

    await expect(
      createJob(ctx, {
        organizationId: "organization",
        parent: { id: parent._id, version },
        name: "Meeting Briefing delivery",
        instructions: "Deliver the briefing.",
        visibility: { mode: "private" },
        access: { integrations: [], web: false },
        type: "once",
        trigger: { at: "2030-01-01T08:00:00Z" },
        createdBy: "person" as Id<"persons">,
      })
    ).rejects.toThrow("configuration has changed")
  }
)

function creationContext() {
  const { database, ctx } = databaseContext({
    scheduler: {
      runAt: vi.fn(async () => "functions:1"),
      cancel: vi.fn(async () => undefined),
    },
  })

  // Convex reads are snapshots; later patches must not mutate earlier reads.
  const get = database.get
  vi.spyOn(database, "get").mockImplementation(async (id) =>
    structuredClone(await get(id))
  )

  return { database, ctx }
}

function creationArgs(folderId?: Id<"folders">) {
  return {
    organizationId: "org",
    name: "Digest",
    instructions: "Send the digest to @Slack.",
    folderId,
    access: {
      integrations: [
        { integration: "slack" as const, tools: ["conversations_add_message"] },
      ],
      web: false,
    },
    type: "cron" as const,
    trigger: { expression: "0 9 * * *", timezone: "UTC" },
    createdBy: "persons:owner" as Id<"persons">,
  }
}

async function insertSlackIntegration(
  database: ReturnType<typeof creationContext>["database"]
) {
  await database.insert("integrations", {
    organizationId: "org",
    integration: "slack",
    scope: "organization",
    status: "active",
  })
}

test("creation stamps the folder when one is named", async () => {
  const { database, ctx } = creationContext()

  await insertSlackIntegration(database)

  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">
  const rootward = await createJob(ctx, creationArgs())
  const filed = await createJob(ctx, creationArgs(folderId))

  expect(rootward.folderId).toBeUndefined()
  expect(filed.folderId).toBe(folderId)
})

test("creation rejects a folder from another organization", async () => {
  const { database, ctx } = creationContext()

  await insertSlackIntegration(database)

  const foreignFolder = (await database.insert(
    "folders",
    folderDoc({ organizationId: "elsewhere" })
  )) as Id<"folders">

  await expect(createJob(ctx, creationArgs(foreignFolder))).rejects.toThrow(
    "Folder was not found."
  )
})

test("event subscriptions follow creation, paused edits, resume, and active edits", async () => {
  const { database, ctx } = creationContext()
  await insertSlackIntegration(database)
  const trigger = {
    integration: "slack" as const,
    event: "message.created",
    match: { channel: "channel-a" },
  }
  const created = await createJob(ctx, {
    ...creationArgs(),
    type: "event",
    trigger,
  })
  const args = { organizationId: "org", jobId: created._id }
  const subscriptions = () => database.query("subscriptions").collect()

  expect(await subscriptions()).toMatchObject([
    { status: "active", match: { channel: "channel-a" } },
  ])
  await pauseJob(ctx, args)
  expect(await subscriptions()).toEqual([])

  await updateJob(ctx, {
    ...args,
    trigger: { ...trigger, match: { channel: "channel-b" } },
  })
  expect(await subscriptions()).toEqual([])
  await resumeJob(ctx, args)
  expect(await subscriptions()).toMatchObject([
    { status: "active", match: { channel: "channel-b" } },
  ])

  await updateJob(ctx, { ...args, trigger })
  expect(await subscriptions()).toMatchObject([
    { status: "active", match: { channel: "channel-a" } },
  ])
  expect(ctx.scheduler.runAt).not.toHaveBeenCalled()
})

test("paused cron edits wait for resume to schedule the new expression", async () => {
  const { database, ctx } = creationContext()
  await insertSlackIntegration(database)
  const created = await createJob(ctx, creationArgs())
  const args = { organizationId: "org", jobId: created._id }

  expect(created.trigger).toHaveProperty("functionId", "functions:1")
  await pauseJob(ctx, args)
  const paused = await updateJob(ctx, {
    ...args,
    trigger: { expression: "0 10 * * *", timezone: "UTC" },
  })
  expect(paused.trigger).not.toHaveProperty("functionId")
  expect(ctx.scheduler.runAt).toHaveBeenCalledTimes(1)

  await database.patch(created._id, {
    trigger: { ...paused.trigger, nextAt: 0 },
  })
  const resumed = await resumeJob(ctx, args)
  expect(resumed.trigger).toMatchObject({
    expression: "0 10 * * *",
    functionId: "functions:1",
    nextAt: expect.any(Number),
  })
  expect("nextAt" in resumed.trigger && resumed.trigger.nextAt).toBeGreaterThan(
    Date.now()
  )
  expect(ctx.scheduler.runAt).toHaveBeenCalledTimes(2)
})

function job(input: { version: number }): Doc<"jobs"> {
  return {
    _id: "parent" as Id<"jobs">,
    _creationTime: 0,
    organizationId: "organization",
    version: input.version,
    name: "Meeting Briefing",
    instructions: "Plan briefings.",
    visibility: { mode: "private" },
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    access: { integrations: [], web: false },
    type: "cron",
    trigger: {
      expression: "0 7 * * *",
      timezone: "UTC",
      nextAt: 1,
    },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  }
}
