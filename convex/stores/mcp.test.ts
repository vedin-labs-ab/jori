import { describe, expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { callJoriStoreTool, normalizeStoreWriteInput } from "./mcp"

const execution = {
  organizationId: "organization",
  personId: "person" as Id<"persons">,
}

describe("store tool dispatch", () => {
  test("search passes normalized filters with the caller's identity", async () => {
    const runQuery = vi.fn(async () => [])

    await callJoriStoreTool({ runQuery } as unknown as ActionCtx, execution, {
      tool: "search_stores",
      args: { query: " launch ", limit: 5 },
    })

    expect(runQuery).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      personId: "person",
      query: "launch",
      includeArchived: false,
      limit: 5,
    })
  })

  test("create leaves visibility to the execution defaults", async () => {
    const runMutation = vi.fn(async () => ({}))

    await callJoriStoreTool(
      { runMutation } as unknown as ActionCtx,
      execution,
      {
        tool: "create_store",
        args: { name: "Dispatch log", schema: { type: "object" } },
      }
    )

    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Dispatch log",
        visibility: undefined,
        schema: { type: "object" },
      })
    )
  })

  test("write forwards claim writes with the expected version", async () => {
    const runMutation = vi.fn(async () => ({}))

    await callJoriTool(
      { runMutation } as unknown as ActionCtx,
      {
        organizationId: "organization",
        principal: { kind: "person", personId: "person" as Id<"persons"> },
      },
      {
        tool: "write_store",
        args: {
          storeId: "store",
          expectedVersion: 4,
          claim: { path: ["dispatches", "morning:1"], value: { sent: true } },
        },
      }
    )

    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      personId: "person",
      storeId: "store",
      expectedVersion: 4,
      write: {
        type: "claim",
        path: ["dispatches", "morning:1"],
        value: { sent: true },
      },
    })
  })
})

test("workspace executions pass their trusted run without a personal identity", async () => {
  const runQuery = vi.fn(async () => null)
  await callJoriTool(
    { runQuery } as unknown as ActionCtx,
    {
      organizationId: "organization",
      _id: "runs_shared" as Id<"runs">,
      principal: { kind: "organization" },
    },
    {
      tool: "read_store",
      args: {
        storeId: "store",
        organizationId: "forged",
        personId: "forged",
        runId: "forged",
      },
    }
  )
  expect(runQuery).toHaveBeenCalledWith(expect.anything(), {
    organizationId: "organization",
    runId: "runs_shared",
    personId: undefined,
    storeId: "store",
  })
})

describe("creating without a schema", () => {
  test("create forwards no schema when the agent omits one", async () => {
    const runMutation = vi.fn(async () => ({}))

    await callJoriStoreTool(
      { runMutation } as unknown as ActionCtx,
      execution,
      { tool: "create_store", args: { name: "Scratch" } }
    )

    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Scratch", schema: undefined })
    )
  })
})

describe("store share dispatch", () => {
  test("share_store routes through the broker to the share mint", async () => {
    const runMutation = vi.fn(async () => ({ url: "u", expiresAt: 1 }))

    await callJoriTool(
      { runMutation } as unknown as ActionCtx,
      {
        organizationId: "organization",
        principal: { kind: "person", personId: "person" as Id<"persons"> },
      },
      { tool: "share_store", args: { storeId: "store", expiresInHours: 24 } }
    )

    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "organization",
      personId: "person",
      storeId: "store",
      expiresInHours: 24,
    })
  })
})

describe("normalizeStoreWriteInput", () => {
  test("maps value, patch, and claim to their write types", () => {
    expect(normalizeStoreWriteInput({ value: { a: 1 } })).toEqual({
      type: "replace",
      value: { a: 1 },
    })
    expect(normalizeStoreWriteInput({ patch: { a: null } })).toEqual({
      type: "merge",
      patch: { a: null },
    })
    expect(
      normalizeStoreWriteInput({ claim: { path: ["a"], value: 1 } })
    ).toEqual({ type: "claim", path: ["a"], value: 1 })
  })

  test("rejects writes that name no operation or a malformed claim", () => {
    expect(() => normalizeStoreWriteInput({})).toThrow("value, patch, or claim")
    expect(() => normalizeStoreWriteInput({ claim: "yes" })).toThrow(
      "claim must be an object"
    )
  })
})
