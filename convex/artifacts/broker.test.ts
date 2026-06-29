import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callProviderTool } from "../broker/tools"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { callArtifactTool } from "./tools/broker"
import { type ArtifactPlatformContext } from "./tools/platform"

vi.mock("../broker/tools", () => ({
  callProviderTool: vi.fn(),
}))

vi.mock("../integrations/runtime", () => ({
  prepareIntegrationForRuntime: vi.fn(async (_ctx, args: RuntimeArgs) => {
    return args.integration
  }),
}))

type RuntimeArgs = {
  integration: Doc<"integrations">
}

type CacheReadResult = {
  expiresAt: number
  value: unknown
}

type MutationCall = {
  args: Record<string, unknown>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("artifact broker cache", () => {
  test("caches external read tool results by exact request", async () => {
    const fixture = createBrokerFixture("read")

    vi.mocked(callProviderTool).mockResolvedValue({
      ok: true,
      messages: [{ text: "hello" }],
    })

    const first = await callArtifactTool(fixture.ctx, platformContext(), {
      args: { channel: "C123", ts: "123.456" },
      tool: "conversations_replies",
    })
    const second = await callArtifactTool(fixture.ctx, platformContext(), {
      args: { ts: "123.456", channel: "C123" },
      tool: "conversations_replies",
    })

    expect(first).toEqual(second)
    expect(callProviderTool).toHaveBeenCalledTimes(1)
    expect(prepareIntegrationForRuntime).toHaveBeenCalledTimes(1)
    expect(fixture.mutations.filter(isCacheWrite)).toHaveLength(1)
  })

  test("forceRefresh bypasses a matching cache entry", async () => {
    const fixture = createBrokerFixture("read")

    vi.mocked(callProviderTool)
      .mockResolvedValueOnce({ ok: true, messages: ["first"] })
      .mockResolvedValueOnce({ ok: true, messages: ["second"] })

    await callArtifactTool(fixture.ctx, platformContext(), {
      args: { channel: "C123", ts: "123.456" },
      tool: "conversations_replies",
    })
    const refreshed = await callArtifactTool(fixture.ctx, platformContext(), {
      args: { channel: "C123", ts: "123.456" },
      forceRefresh: true,
      tool: "conversations_replies",
    })

    expect(refreshed).toEqual({ ok: true, messages: ["second"] })
    expect(callProviderTool).toHaveBeenCalledTimes(2)
  })

  test("invalidates external read cache after external writes", async () => {
    const fixture = createBrokerFixture("write")

    vi.mocked(callProviderTool).mockResolvedValue({ ok: true, ts: "111.222" })

    await callArtifactTool(fixture.ctx, platformContext(), {
      args: { channel: "C123", text: "hello" },
      tool: "conversations_add_message",
    })

    expect(fixture.mutations.some(isCacheInvalidate)).toBe(true)
  })
})

function createBrokerFixture(access: "read" | "write") {
  const cache = new Map<string, unknown>()
  const mutations: MutationCall[] = []
  const integration = slackIntegration()
  const ctx = {
    runQuery: async () => ({
      integration,
      permission: {
        access,
        surface: "slack",
      },
    }),
    runMutation: async (_reference: unknown, args: Record<string, unknown>) => {
      mutations.push({ args })

      if (isCacheRead(args)) {
        return cache.has(args.cacheKey)
          ? ({
              expiresAt: Date.now() + 60_000,
              value: cache.get(args.cacheKey),
            } satisfies CacheReadResult)
          : null
      }

      if (isCacheWriteArgs(args)) {
        cache.set(args.cacheKey, args.value)
      } else if (isCacheInvalidate({ args })) {
        cache.clear()
      }

      return null
    },
  } as unknown as ActionCtx

  return { ctx, mutations }
}

function isCacheRead(args: Record<string, unknown>): args is {
  cacheKey: string
} {
  return "cacheKey" in args && !("value" in args)
}

function isCacheWrite(call: MutationCall) {
  return isCacheWriteArgs(call.args)
}

function isCacheWriteArgs(args: Record<string, unknown>): args is {
  cacheKey: string
  value: unknown
} {
  return typeof args.cacheKey === "string" && "value" in args
}

function isCacheInvalidate(call: MutationCall) {
  return "surface" in call.args && !("cacheKey" in call.args)
}

function platformContext(): ArtifactPlatformContext {
  return {
    tenantId: "tenant",
    artifactId: "artifact" as Id<"artifacts">,
    versionId: "version" as Id<"artifactVersions">,
    personId: "person" as Id<"persons">,
  }
}

function slackIntegration(): Doc<"integrations"> {
  return {
    _creationTime: 0,
    _id: "integration" as Id<"integrations">,
    createdAt: 0,
    createdBy: "person" as Id<"persons">,
    credentials: { tokens: { access: "user-token", bot: "bot-token" } },
    externalId: "T123",
    integration: "slack",
    scope: "tenant",
    status: "active",
    tenantId: "tenant",
    updatedAt: 0,
  }
}
