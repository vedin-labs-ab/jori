import { describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { canExecuteJobRunTools } from "./execution"

describe("durable job run tool execution", () => {
  test("accepts an active root at the snapshotted generation", async () => {
    const owner = job()

    await expect(canExecuteJobRunTools(context([owner]), run())).resolves.toBe(
      true
    )
  })

  test.each([
    ["missing", null],
    ["paused", job({ status: "paused" })],
    ["completed", job({ status: "completed" })],
    ["stale generation", job({ version: 3 })],
    ["wrong organization", job({ organizationId: "another-organization" })],
    [
      "wrong principal",
      job({
        principal: {
          kind: "person",
          personId: "another-person" as Id<"persons">,
        },
      }),
    ],
    ["one-time child", job({ parentId: "another-owner", type: "once" })],
  ])("rejects a %s owner", async (_label, owner) => {
    const records = owner === null ? [] : [owner]

    await expect(canExecuteJobRunTools(context(records), run())).resolves.toBe(
      false
    )
  })
})

describe("owned one-time job run tool execution", () => {
  test("validates a fired child against its durable parent", async () => {
    const owner = job({ id: "owner" })
    const childRun = run({
      jobId: "deleted-child",
      jobParentId: owner._id,
    })

    await expect(
      canExecuteJobRunTools(context([owner]), childRun)
    ).resolves.toBe(true)
  })

  test("rejects a fired child after its parent changes", async () => {
    const owner = job({ id: "owner", version: 3 })
    const childRun = run({
      jobId: "deleted-child",
      jobParentId: owner._id,
    })

    await expect(
      canExecuteJobRunTools(context([owner]), childRun)
    ).resolves.toBe(false)
  })
})

describe("other run tool execution", () => {
  test("preserves a standalone one-time run with its completed row", async () => {
    const oneTime = job({ status: "completed", type: "once" })

    await expect(
      canExecuteJobRunTools(context([oneTime]), run())
    ).resolves.toBe(true)
  })

  test("derives legacy research-child ownership from the root run", async () => {
    const owner = job({ version: 3 })
    const root = run({ id: "root" })
    const researchChild = run({
      jobId: null,
      id: "research",
      parentId: root._id,
      rootId: root._id,
    })

    await expect(
      canExecuteJobRunTools(context([owner, root]), researchChild)
    ).resolves.toBe(false)
  })

  test("preserves interactive and interactive-child runs", async () => {
    const interactiveRoot = run({
      jobId: null,
      id: "root",
    })
    const child = run({
      jobId: null,
      parentId: interactiveRoot._id,
      rootId: interactiveRoot._id,
    })
    const ctx = context([interactiveRoot])

    await expect(canExecuteJobRunTools(ctx, interactiveRoot)).resolves.toBe(
      true
    )
    await expect(canExecuteJobRunTools(ctx, child)).resolves.toBe(true)
  })
})

test("rejects terminal runs before any tool execution", async () => {
  await expect(
    canExecuteJobRunTools(context([]), run({ status: "completed" }))
  ).resolves.toBe(false)
})

function context(records: Array<Doc<"jobs"> | Doc<"runs">>) {
  const byId = new Map(records.map((record) => [record._id, record]))

  return {
    db: {
      get: vi.fn(async (id: Id<"jobs"> | Id<"runs">) => byId.get(id) ?? null),
    },
  } as unknown as QueryLikeCtx
}

function job(
  input: {
    version?: number
    id?: string
    parentId?: string
    principal?: Doc<"jobs">["principal"]
    status?: Doc<"jobs">["status"]
    organizationId?: string
    type?: Doc<"jobs">["type"]
  } = {}
): Doc<"jobs"> {
  return {
    _id: (input.id ?? "job") as Id<"jobs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Do the work.",
    name: "Job",
    parent:
      input.parentId === undefined
        ? undefined
        : { id: input.parentId as Id<"jobs"> },
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
    jobId?: string | null
    jobParentId?: string | Id<"jobs">
    jobVersion?: number
    id?: string
    parentId?: string | Id<"runs">
    rootId?: string | Id<"runs">
    status?: Doc<"runs">["status"]
  } = {}
): Doc<"runs"> {
  const jobId =
    input.jobId === null ? undefined : ((input.jobId ?? "job") as Id<"jobs">)

  return {
    _id: (input.id ?? "run") as Id<"runs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    job:
      jobId === undefined
        ? undefined
        : {
            id: jobId,
            parentId: input.jobParentId as Id<"jobs"> | undefined,
            version: input.jobVersion ?? 2,
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
