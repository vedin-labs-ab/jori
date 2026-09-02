import { expect, test, vi } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { folderDoc } from "../../../test/convex/folders"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { createJob } from "./create"

test.each([
  undefined,
  1,
])("rejects owned work from stale parent configuration %s", async (version) => {
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
})

function creationContext() {
  const { database, ctx } = databaseContext({
    scheduler: { runAt: vi.fn(async () => "functions:1") },
  })

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
