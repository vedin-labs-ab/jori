import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  type ArtifactPlatformContext,
  callArtifactPlatformTool,
  createArtifactPlatformToolCacheArgs,
} from "./tools/platform"

type CapturedCall = {
  kind: "query" | "mutation"
  args: Record<string, unknown>
}

describe("artifact platform tools", () => {
  test("passes validator-safe context to artifact-level internals", async () => {
    const calls: CapturedCall[] = []
    const ctx = createCapturingActionCtx(calls)
    const context = createPlatformContext()

    await callArtifactPlatformTool(ctx, context, {
      tool: "readState",
      args: { contractName: "emailTriageLatest" },
    })
    await callArtifactPlatformTool(ctx, context, {
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
          tenantId: "tenant",
          artifactId: "artifact",
          personId: "person" as Id<"persons">,
          contractName: "emailTriageLatest",
        },
      },
      {
        kind: "mutation",
        args: {
          tenantId: "tenant",
          artifactId: "artifact",
          personId: "person" as Id<"persons">,
          contractName: "emailTriageLatest",
          expectedVersion: 1,
          write: { type: "replace", value: { threads: [] } },
        },
      },
    ])
  })
})

test("includes artifact prompt model in prompt cache identity", () => {
  const originalModel = process.env.OPENROUTER_ARTIFACT_MODEL

  try {
    process.env.OPENROUTER_ARTIFACT_MODEL = "z-ai/glm-5.2"

    expect(
      createArtifactPlatformToolCacheArgs("promptModel", {
        input: { message: "hello" },
      })
    ).toEqual({
      _miloCache: { model: "z-ai/glm-5.2" },
      input: { message: "hello" },
    })

    expect(
      createArtifactPlatformToolCacheArgs("readState", {
        contractName: "state",
      })
    ).toEqual({ contractName: "state" })
  } finally {
    restoreArtifactModel(originalModel)
  }
})

function restoreArtifactModel(value: string | undefined) {
  if (value === undefined) {
    delete process.env.OPENROUTER_ARTIFACT_MODEL
    return
  }

  process.env.OPENROUTER_ARTIFACT_MODEL = value
}

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

function createPlatformContext(): ArtifactPlatformContext {
  return {
    tenantId: "tenant",
    artifactId: "artifact" as Id<"artifacts">,
    versionId: "version" as Id<"artifactVersions">,
    personId: "person" as Id<"persons">,
  }
}
