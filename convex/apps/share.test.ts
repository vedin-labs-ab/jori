import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { appSessionDurationMs } from "./serve/session"
import {
  canOpenShare,
  handleAppSharePreflight,
  handleAppShareRequest,
  shareSessionExpiresAt,
  sharesToRetire,
} from "./serve/share"
import { isStateEntryVisible } from "./state"
import { callAppTool } from "./tools/broker"
import { type AppPlatformContext } from "./tools/platform"

vi.mock("../broker/tools", () => ({
  callProviderTool: vi.fn(),
}))

vi.mock("../integrations/runtime", () => ({
  prepareIntegrationForRuntime: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("share opening", () => {
  test("accepts a live share for an accessible published app", () => {
    expect(canOpenShare(share(), app(), openArgs())).toBe(true)
  })

  test("rejects a wrong secret", () => {
    expect(canOpenShare(share(), app(), openArgs({ secret: "wrong" }))).toBe(
      false
    )
  })

  test("rejects an expired share", () => {
    expect(canOpenShare(share(), app(), openArgs({ now: 10_000 }))).toBe(false)
  })

  test("rejects archived and unpublished apps", () => {
    expect(canOpenShare(share(), app({ archivedAt: 5 }), openArgs())).toBe(
      false
    )
    expect(
      canOpenShare(share(), app({ versionId: undefined }), openArgs())
    ).toBe(false)
  })

  test("rejects shares whose creator lost access to the app", () => {
    const stranger = app({ ownerId: "other" as Id<"persons"> })

    expect(canOpenShare(share(), stranger, openArgs())).toBe(false)
    expect(
      canOpenShare(
        share(),
        app({ ...stranger, access: "organization" }),
        openArgs()
      )
    ).toBe(true)
  })

  test("caps view sessions at the share expiry", () => {
    expect(shareSessionExpiresAt({ expiresAt: 10_000 }, 9_000)).toBe(10_000)
    expect(
      shareSessionExpiresAt({ expiresAt: Number.MAX_SAFE_INTEGER }, 9_000)
    ).toBe(9_000 + appSessionDurationMs)
  })
})

describe("share pruning", () => {
  test("overlapping live shares are all kept", () => {
    const live = [
      share({ createdAt: 1, expiresAt: 5_000 }),
      share({ createdAt: 2, expiresAt: 9_000 }),
    ]

    expect(sharesToRetire(live, 1_000)).toEqual([])
  })

  test("expired shares remain in history", () => {
    const expired = share({ createdAt: 1, expiresAt: 500 })

    expect(
      sharesToRetire([expired, share({ expiresAt: 9_000 })], 1_000)
    ).toEqual([])
  })

  test("the oldest active shares make room at capacity", () => {
    const shares = Array.from({ length: 20 }, (_, index) =>
      share({ createdAt: index, expiresAt: 9_000 })
    )
    const pruned = sharesToRetire(shares, 1_000)

    expect(pruned).toHaveLength(1)
    expect(pruned[0]?.createdAt).toBe(0)
  })
})

describe("share state visibility", () => {
  test("members see personal and shared entries", () => {
    expect(isStateEntryVisible({ scope: "personal" }, "member")).toBe(true)
    expect(isStateEntryVisible({ scope: "personal" }, undefined)).toBe(true)
    expect(isStateEntryVisible({ scope: "shared" }, "member")).toBe(true)
  })

  test("share viewers see shared entries only", () => {
    expect(isStateEntryVisible({ scope: "shared" }, "share")).toBe(true)
    expect(isStateEntryVisible({ scope: "personal" }, "share")).toBe(false)
  })
})

describe("share grant enforcement", () => {
  test("share sessions cannot call tools beyond the view surface", async () => {
    const ctx = brokerCtx()

    for (const tool of ["updateState", "promptModel", "search_automations"]) {
      await expect(callAppTool(ctx, shareContext(), { tool })).rejects.toThrow(
        "view-only"
      )
    }

    expect(vi.mocked(ctx.runQuery)).not.toHaveBeenCalled()
    expect(vi.mocked(ctx.runMutation)).not.toHaveBeenCalled()
  })

  test("share sessions read state with the share grant applied", async () => {
    const ctx = brokerCtx()

    vi.mocked(ctx.runQuery).mockResolvedValue({ value: "shared" })

    const result = await callAppTool(ctx, shareContext(), {
      tool: "readState",
      args: { contractName: "doc" },
    })

    expect(result).toEqual({ value: "shared" })
    expect(vi.mocked(ctx.runQuery)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ contractName: "doc", grant: "share" })
    )
  })
})

const exchangeEnvironment = {
  JORI_APP_FRAME_ANCESTORS: "https://app.jori.example",
}

describe("share exchange preflight", () => {
  test("allows configured app origins only", () => {
    const allowed = handleAppSharePreflight(
      exchangeRequest({}, "https://app.jori.example"),
      exchangeEnvironment
    )

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://app.jori.example"
    )
    expect(allowed.headers.get("access-control-allow-methods")).toBe("POST")

    const denied = handleAppSharePreflight(
      exchangeRequest({}, "https://evil.example"),
      exchangeEnvironment
    )

    expect(denied.headers.get("access-control-allow-origin")).toBeNull()
  })
})

describe("share exchange endpoint", () => {
  test("returns a uniform 401 for malformed and rejected exchanges", async () => {
    const ctx = brokerCtx()

    vi.mocked(ctx.runMutation).mockResolvedValue(null)

    const malformed = await handleAppShareRequest(
      ctx,
      exchangeRequest({ appId: "app_1" }),
      exchangeEnvironment
    )

    expect(malformed.status).toBe(401)
    expect(vi.mocked(ctx.runMutation)).not.toHaveBeenCalled()

    const rejected = await handleAppShareRequest(
      ctx,
      exchangeRequest({ appId: "app_1", secret: "nope" }),
      exchangeEnvironment
    )

    expect(rejected.status).toBe(401)
  })

  test("returns the minted session with CORS for allowed origins", async () => {
    const ctx = brokerCtx()
    const session = { token: "token", title: "Prep", expiresAt: 99 }

    vi.mocked(ctx.runMutation).mockResolvedValue(session)

    const response = await handleAppShareRequest(
      ctx,
      exchangeRequest(
        { appId: "app_1", secret: "s3cret" },
        "https://app.jori.example"
      ),
      exchangeEnvironment
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://app.jori.example"
    )
    expect(await response.json()).toEqual(session)
    expect(vi.mocked(ctx.runMutation)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ appId: "app_1", secret: "s3cret" })
    )
  })
})

function app(overrides: Partial<Doc<"apps">> = {}) {
  return {
    _id: "app" as Id<"apps">,
    organizationId: "organization",
    ownerId: "creator" as Id<"persons">,
    access: "personal",
    versionId: "version" as Id<"appVersions">,
    ...overrides,
  } as Doc<"apps">
}

function share(overrides: Partial<Doc<"appShares">> = {}) {
  return {
    _id: "share" as Id<"appShares">,
    organizationId: "organization",
    appId: "app" as Id<"apps">,
    createdBy: "creator" as Id<"persons">,
    secret: "s3cret",
    createdAt: 0,
    expiresAt: 10_000,
    ...overrides,
  } as Doc<"appShares">
}

function openArgs(overrides: Partial<{ secret: string; now: number }> = {}) {
  return { secret: "s3cret", now: 1_000, ...overrides }
}

function shareContext(): AppPlatformContext {
  return {
    organizationId: "organization",
    appId: "app" as Id<"apps">,
    versionId: "version" as Id<"appVersions">,
    personId: "creator" as Id<"persons">,
    grant: "share",
  }
}

function brokerCtx() {
  return {
    runQuery: vi.fn(),
    runMutation: vi.fn(),
  } as unknown as ActionCtx & {
    runQuery: ReturnType<typeof vi.fn>
    runMutation: ReturnType<typeof vi.fn>
  }
}

function exchangeRequest(body: unknown, origin?: string) {
  return new Request("https://site.example/apps/share", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin === undefined ? {} : { origin }),
    },
    body: JSON.stringify(body),
  })
}
