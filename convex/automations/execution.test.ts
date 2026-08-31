import { describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { canExecuteAutomationRunTools } from "./execution"

describe("durable automation run tool execution", () => {
  test("accepts an active root at the snapshotted generation", async () => {
    const owner = automation()

    await expect(
      canExecuteAutomationRunTools(context([owner]), run())
    ).resolves.toBe(true)
  })

  test.each([
    ["missing", null],
    ["paused", automation({ status: "paused" })],
    ["completed", automation({ status: "completed" })],
    ["stale generation", automation({ version: 3 })],
    [
      "wrong organization",
      automation({ organizationId: "another-organization" }),
    ],
    [
      "wrong principal",
      automation({
        principal: {
          kind: "person",
          personId: "another-person" as Id<"persons">,
        },
      }),
    ],
    ["one-time child", automation({ parentId: "another-owner", type: "once" })],
  ])("rejects a %s owner", async (_label, owner) => {
    const records = owner === null ? [] : [owner]

    await expect(
      canExecuteAutomationRunTools(context(records), run())
    ).resolves.toBe(false)
  })
})

describe("owned one-time automation run tool execution", () => {
  test("validates a fired child against its durable parent", async () => {
    const owner = automation({ id: "owner" })
    const childRun = run({
      automationId: "deleted-child",
      automationParentId: owner._id,
    })

    await expect(
      canExecuteAutomationRunTools(context([owner]), childRun)
    ).resolves.toBe(true)
  })

  test("rejects a fired child after its parent changes", async () => {
    const owner = automation({ id: "owner", version: 3 })
    const childRun = run({
      automationId: "deleted-child",
      automationParentId: owner._id,
    })

    await expect(
      canExecuteAutomationRunTools(context([owner]), childRun)
    ).resolves.toBe(false)
  })
})

describe("other run tool execution", () => {
  test("preserves a standalone one-time run with its completed row", async () => {
    const oneTime = automation({ status: "completed", type: "once" })

    await expect(
      canExecuteAutomationRunTools(context([oneTime]), run())
    ).resolves.toBe(true)
  })

  test("derives legacy research-child ownership from the root run", async () => {
    const owner = automation({ version: 3 })
    const root = run({ id: "root" })
    const researchChild = run({
      automationId: null,
      id: "research",
      parentId: root._id,
      rootId: root._id,
    })

    await expect(
      canExecuteAutomationRunTools(context([owner, root]), researchChild)
    ).resolves.toBe(false)
  })

  test("preserves interactive and interactive-child runs", async () => {
    const interactiveRoot = run({
      automationId: null,
      id: "root",
    })
    const child = run({
      automationId: null,
      parentId: interactiveRoot._id,
      rootId: interactiveRoot._id,
    })
    const ctx = context([interactiveRoot])

    await expect(
      canExecuteAutomationRunTools(ctx, interactiveRoot)
    ).resolves.toBe(true)
    await expect(canExecuteAutomationRunTools(ctx, child)).resolves.toBe(true)
  })
})

test("rejects terminal runs before any tool execution", async () => {
  await expect(
    canExecuteAutomationRunTools(context([]), run({ status: "completed" }))
  ).resolves.toBe(false)
})

function context(records: Array<Doc<"automations"> | Doc<"runs">>) {
  const byId = new Map(records.map((record) => [record._id, record]))

  return {
    db: {
      get: vi.fn(
        async (id: Id<"automations"> | Id<"runs">) => byId.get(id) ?? null
      ),
    },
  } as unknown as QueryLikeCtx
}

function automation(
  input: {
    version?: number
    id?: string
    parentId?: string
    principal?: Doc<"automations">["principal"]
    status?: Doc<"automations">["status"]
    organizationId?: string
    type?: Doc<"automations">["type"]
  } = {}
): Doc<"automations"> {
  return {
    _id: (input.id ?? "automation") as Id<"automations">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Do the work.",
    name: "Automation",
    parent:
      input.parentId === undefined
        ? undefined
        : { id: input.parentId as Id<"automations"> },
    version: input.version ?? 2,
    principal: input.principal ?? {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    visibility: { mode: "private" },
    status: input.status ?? "active",
    organizationId: input.organizationId ?? "organization",
    trigger: { expression: "0 8 * * *", nextAt: 1000, timezone: "UTC" },
    type: input.type ?? "cron",
    updatedAt: 0,
  }
}

function run(
  input: {
    automationId?: string | null
    automationParentId?: string | Id<"automations">
    automationVersion?: number
    id?: string
    parentId?: string | Id<"runs">
    rootId?: string | Id<"runs">
    status?: Doc<"runs">["status"]
  } = {}
): Doc<"runs"> {
  const automationId =
    input.automationId === null
      ? undefined
      : ((input.automationId ?? "automation") as Id<"automations">)

  return {
    _id: (input.id ?? "run") as Id<"runs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    automation:
      automationId === undefined
        ? undefined
        : {
            id: automationId,
            parentId: input.automationParentId as Id<"automations"> | undefined,
            version: input.automationVersion ?? 2,
          },
    cause: { type: "manual" },
    createdAt: 0,
    parentId: input.parentId as Id<"runs"> | undefined,
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    rootId: input.rootId as Id<"runs"> | undefined,
    audience: "person",
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: input.status ?? "running",
    organizationId: "organization",
  }
}
