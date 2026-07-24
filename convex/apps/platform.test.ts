import { describe, expect, test } from "vitest"
import { miloModel } from "../../contracts/billing"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  type AppPlatformContext,
  callAppPlatformTool,
  createAppPlatformToolCacheArgs,
} from "./tools/platform"

type CapturedCall = {
  kind: "query" | "mutation"
  args: Record<string, unknown>
}

describe("app platform tools", () => {
  test("passes validator-safe context to app-level internals", async () => {
    const calls: CapturedCall[] = []
    const ctx = createCapturingActionCtx(calls)
    const context = createPlatformContext()

    await callAppPlatformTool(ctx, context, {
      tool: "readState",
      args: { contractName: "emailTriageLatest" },
    })
    await callAppPlatformTool(ctx, context, {
      tool: "updateState",
      args: {
        contractName: "emailTriageLatest",
        expectedVersion: 1,
        value: { threads: [] },
      },
    })

    expect(calls).toEqual([
      {
        kind: "query",
        args: {
          organizationId: "organization",
          appId: "app",
          personId: "person" as Id<"persons">,
          grant: "member",
          contractName: "emailTriageLatest",
        },
      },
      {
        kind: "mutation",
        args: {
          organizationId: "organization",
          appId: "app",
          personId: "person" as Id<"persons">,
          contractName: "emailTriageLatest",
          expectedVersion: 1,
          write: { type: "replace", value: { threads: [] } },
        },
      },
    ])
  })
})

test("includes app prompt model in prompt cache identity", () => {
  expect(
    createAppPlatformToolCacheArgs("promptModel", {
      input: { message: "hello" },
    })
  ).toEqual({
    _miloCache: { model: miloModel },
    input: { message: "hello" },
  })

  expect(
    createAppPlatformToolCacheArgs("readState", {
      contractName: "state",
    })
  ).toEqual({ contractName: "state" })
})

function createCapturingActionCtx(calls: CapturedCall[]) {
  return {
    runQuery: async (_reference: unknown, args: Record<string, unknown>) => {
      calls.push({ kind: "query", args })

      return null
    },
    runMutation: async (_reference: unknown, args: Record<string, unknown>) => {
      calls.push({ kind: "mutation", args })

      return null
    },
  } as unknown as ActionCtx
}

function createPlatformContext(): AppPlatformContext {
  return {
    organizationId: "organization",
    appId: "app" as Id<"apps">,
    versionId: "version" as Id<"appVersions">,
    personId: "person" as Id<"persons">,
    grant: "member",
  }
}
