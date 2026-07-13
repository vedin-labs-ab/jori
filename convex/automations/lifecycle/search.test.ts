import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { searchAutomations } from "./search"

test("default search returns active top-level automations only", async () => {
  const rows = [
    automation({ id: "parent", status: "active", at: 100 }),
    automation({ id: "child", status: "active", at: 50, parentId: "parent" }),
    automation({ id: "paused", status: "paused", at: 75 }),
  ]
  const { ctx, equals, withIndex } = searchContext(rows)

  const result = await searchAutomations(ctx, { tenantId: "tenant" })

  expect(result.map((item) => item._id)).toEqual(["parent"])
  expect(withIndex).toHaveBeenCalledWith(
    "by_tenant_and_status_and_parent",
    expect.any(Function)
  )
  expect(equals.mock.calls).toEqual([
    ["tenantId", "tenant"],
    ["status", "active"],
    ["parentId", undefined],
  ])
})

test("completed search still omits owned automations", async () => {
  const rows = [
    automation({ id: "active", status: "active", at: 100 }),
    automation({ id: "completed", status: "completed", at: 200 }),
    automation({
      id: "completed-child",
      status: "completed",
      at: 50,
      parentId: "active",
    }),
  ]
  const { ctx, equals, withIndex } = searchContext(rows)

  const result = await searchAutomations(ctx, {
    tenantId: "tenant",
    includeCompleted: true,
  })

  expect(result.map((item) => item._id)).toEqual(["active", "completed"])
  expect(withIndex).toHaveBeenCalledWith(
    "by_tenant_and_parent",
    expect.any(Function)
  )
  expect(equals.mock.calls).toEqual([
    ["tenantId", "tenant"],
    ["parentId", undefined],
  ])
})

function searchContext(rows: Doc<"automations">[]) {
  let tenantId: unknown
  let status: unknown
  let filtersByParent = false
  const equals = vi.fn((field: string, value: unknown) => {
    if (field === "tenantId") {
      tenantId = value
    } else if (field === "status") {
      status = value
    } else if (field === "parentId") {
      filtersByParent = true
    }
  })
  const index = {
    eq: (field: string, value: unknown) => {
      equals(field, value)
      return index
    },
  }
  const collect = vi.fn(async () =>
    rows.filter(
      (row) =>
        row.tenantId === tenantId &&
        (status === undefined || row.status === status) &&
        (!filtersByParent || row.parentId === undefined)
    )
  )
  const withIndex = vi.fn(
    (_name: string, range: (value: typeof index) => typeof index) => {
      range(index)
      return { collect }
    }
  )
  const ctx = {
    db: { query: vi.fn(() => ({ withIndex })) },
  } as unknown as QueryCtx

  return { ctx, equals, withIndex }
}

function automation(input: {
  id: string
  status: Doc<"automations">["status"]
  at: number
  parentId?: string
}): Doc<"automations"> {
  return {
    _id: input.id as Id<"automations">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Prepare the meeting.",
    name: input.id,
    parentId: input.parentId as Id<"automations"> | undefined,
    principal: { kind: "organization" },
    scope: "organization",
    status: input.status,
    tenantId: "tenant",
    trigger: { at: input.at },
    type: "once",
    updatedAt: 0,
  }
}
