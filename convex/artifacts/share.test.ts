import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { artifactSessionDurationMs } from "./serve/session"
import {
  canOpenShare,
  handleArtifactSharePreflight,
  handleArtifactShareRequest,
  shareSessionExpiresAt,
  sharesToRetire,
} from "./serve/share"
import { isStateEntryVisible } from "./state"
import { callArtifactTool } from "./tools/broker"
import { type ArtifactPlatformContext } from "./tools/platform"

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
  test("accepts a live share for an accessible published artifact", () => {
    expect(canOpenShare(share(), artifact(), openArgs())).toBe(true)
  })

  test("rejects a wrong secret", () => {
    expect(
      canOpenShare(share(), artifact(), openArgs({ secret: "wrong" }))
    ).toBe(false)
  })

  test("rejects an expired share", () => {
    expect(canOpenShare(share(), artifact(), openArgs({ now: 10_000 }))).toBe(
      false
    )
  })

  test("rejects archived and unpublished artifacts", () => {
    expect(canOpenShare(share(), artifact({ archivedAt: 5 }), openArgs())).toBe(
      false
    )
    expect(
      canOpenShare(share(), artifact({ versionId: undefined }), openArgs())
    ).toBe(false)
  })

  test("rejects shares whose creator lost access to the artifact", () => {
    const stranger = artifact({ ownerId: "other" as Id<"persons"> })

    expect(canOpenShare(share(), stranger, openArgs())).toBe(false)
    expect(
      canOpenShare(
        share(),
        artifact({ ...stranger, access: "organization" }),
        openArgs()
      )
    ).toBe(true)
  })

  test("caps view sessions at the share expiry", () => {
    expect(shareSessionExpiresAt({ expiresAt: 10_000 }, 9_000)).toBe(10_000)
    expect(
      shareSessionExpiresAt({ expiresAt: Number.MAX_SAFE_INTEGER }, 9_000)
    ).toBe(9_000 + artifactSessionDurationMs)
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
      await expect(
        callArtifactTool(ctx, shareContext(), { tool })
      ).rejects.toThrow("view-only")
    }

    expect(vi.mocked(ctx.runQuery)).not.toHaveBeenCalled()
    expect(vi.mocked(ctx.runMutation)).not.toHaveBeenCalled()
  })

  test("share sessions read state with the share grant applied", async () => {
    const ctx = brokerCtx()

    vi.mocked(ctx.runQuery).mockResolvedValue({ value: "shared" })

    const result = await callArtifactTool(ctx, shareContext(), {
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
  MILO_ARTIFACT_FRAME_ANCESTORS: "https://app.milo.example",
}

describe("share exchange preflight", () => {
  test("allows configured app origins only", () => {
    const allowed = handleArtifactSharePreflight(
      exchangeRequest({}, "https://app.milo.example"),
      exchangeEnvironment
    )

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://app.milo.example"
    )
    expect(allowed.headers.get("access-control-allow-methods")).toBe("POST")

    const denied = handleArtifactSharePreflight(
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

    const malformed = await handleArtifactShareRequest(
      ctx,
      exchangeRequest({ artifactId: "artifact_1" }),
      exchangeEnvironment
    )

    expect(malformed.status).toBe(401)
    expect(vi.mocked(ctx.runMutation)).not.toHaveBeenCalled()

    const rejected = await handleArtifactShareRequest(
      ctx,
      exchangeRequest({ artifactId: "artifact_1", secret: "nope" }),
      exchangeEnvironment
    )

    expect(rejected.status).toBe(401)
  })

  test("returns the minted session with CORS for allowed origins", async () => {
    const ctx = brokerCtx()
    const session = { token: "token", title: "Prep", expiresAt: 99 }

    vi.mocked(ctx.runMutation).mockResolvedValue(session)

    const response = await handleArtifactShareRequest(
      ctx,
      exchangeRequest(
        { artifactId: "artifact_1", secret: "s3cret" },
        "https://app.milo.example"
      ),
      exchangeEnvironment
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://app.milo.example"
    )
    expect(await response.json()).toEqual(session)
    expect(vi.mocked(ctx.runMutation)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ artifactId: "artifact_1", secret: "s3cret" })
    )
  })
})

function artifact(overrides: Partial<Doc<"artifacts">> = {}) {
  return {
    _id: "artifact" as Id<"artifacts">,
    organizationId: "organization",
    ownerId: "creator" as Id<"persons">,
    access: "personal",
    versionId: "version" as Id<"artifactVersions">,
    ...overrides,
  } as Doc<"artifacts">
}

function share(overrides: Partial<Doc<"artifactShares">> = {}) {
  return {
    _id: "share" as Id<"artifactShares">,
    organizationId: "organization",
    artifactId: "artifact" as Id<"artifacts">,
    createdBy: "creator" as Id<"persons">,
    secret: "s3cret",
    createdAt: 0,
    expiresAt: 10_000,
    ...overrides,
  } as Doc<"artifactShares">
}

function openArgs(overrides: Partial<{ secret: string; now: number }> = {}) {
  return { secret: "s3cret", now: 1_000, ...overrides }
}

function shareContext(): ArtifactPlatformContext {
  return {
    organizationId: "organization",
    artifactId: "artifact" as Id<"artifacts">,
    versionId: "version" as Id<"artifactVersions">,
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
  return new Request("https://site.example/artifacts/share", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin === undefined ? {} : { origin }),
    },
    body: JSON.stringify(body),
  })
}
