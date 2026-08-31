import { expect, test, vi } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { folderDoc } from "../../../test/convex/folders"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { createAutomation } from "./create"

test.each([
  undefined,
  1,
])("rejects owned work from stale parent configuration %s", async (expectedParentConfigurationVersion) => {
  const parent = automation({ configurationVersion: 2 })
  const ctx = {
    db: { get: vi.fn(async () => parent) },
  } as unknown as MutationCtx

  await expect(
    createAutomation(ctx, {
      organizationId: "organization",
      parentId: parent._id,
      expectedParentConfigurationVersion,
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
  const rootward = await createAutomation(ctx, creationArgs())
  const filed = await createAutomation(ctx, creationArgs(folderId))

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

  await expect(
    createAutomation(ctx, creationArgs(foreignFolder))
  ).rejects.toThrow("Folder was not found.")
})

function automation(input: {
  configurationVersion: number
}): Doc<"automations"> {
  return {
    _id: "parent" as Id<"automations">,
    _creationTime: 0,
    organizationId: "organization",
    configurationVersion: input.configurationVersion,
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
