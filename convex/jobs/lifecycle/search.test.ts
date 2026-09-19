import { expect, test } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { type Doc, type Id } from "../../_generated/dataModel"
import { searchJobs } from "./search"

test("default search returns active top-level jobs only", async () => {
  const rows = [
    job({ id: "parent", status: "active", at: 100 }),
    job({ id: "child", status: "active", at: 50, parentId: "parent" }),
    job({ id: "paused", status: "paused", at: 75 }),
    job({
      id: "foreign",
      status: "active",
      at: 25,
      organizationId: "elsewhere",
    }),
  ]
  const ctx = await searchContext(rows)

  const result = await searchJobs(ctx, {
    organizationId: "organization",
  })

  expect(result.map((item) => item._id)).toEqual(["parent"])
})

test("completed search still omits owned jobs", async () => {
  const rows = [
    job({ id: "active", status: "active", at: 100 }),
    job({ id: "completed", status: "completed", at: 200 }),
    job({
      id: "completed-child",
      status: "completed",
      at: 50,
      parentId: "active",
    }),
    job({
      id: "foreign",
      status: "completed",
      at: 25,
      organizationId: "elsewhere",
    }),
  ]
  const ctx = await searchContext(rows)

  const result = await searchJobs(ctx, {
    organizationId: "organization",
    includeCompleted: true,
  })

  expect(result.map((item) => item._id)).toEqual(["active", "completed"])
})

test.each(["active", "paused", "completed"] as const)(
  "%s search filters status before applying the result limit",
  async (status) => {
    const ctx = await searchContext([
      job({ id: "active", status: "active", at: 100 }),
      job({ id: "paused", status: "paused", at: 200 }),
      job({ id: "completed", status: "completed", at: 300 }),
      job({ id: "child", status, at: 0, parentId: "parent" }),
      job({ id: "foreign", status, at: 0, organizationId: "elsewhere" }),
    ])

    const result = await searchJobs(ctx, {
      organizationId: "organization",
      status,
      limit: 1,
    })

    expect(result.map((item) => item._id)).toEqual([status])
  }
)

async function searchContext(rows: Doc<"jobs">[]) {
  const { database, ctx } = databaseContext()

  for (const row of rows) {
    await database.insert("jobs", row)
  }

  return ctx
}

function job(input: {
  id: string
  status: Doc<"jobs">["status"]
  at: number
  parentId?: string
  organizationId?: string
}): Doc<"jobs"> {
  return {
    _id: input.id as Id<"jobs">,
    _creationTime: 0,
    access: { integrations: [], jori: [] },
    createdAt: 0,
    instructions: "Prepare the meeting.",
    name: input.id,
    parent:
      input.parentId === undefined
        ? undefined
        : { id: input.parentId as Id<"jobs">, version: 1 },
    principal: { kind: "organization" },
    visibility: { mode: "organization" },
    status: input.status,
    organizationId: input.organizationId ?? "organization",
    trigger: { at: input.at },
    type: "once",
    updatedAt: 0,
  }
}
