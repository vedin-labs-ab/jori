import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { createArtifactRenderCsp, readArtifactFramePolicy } from "./serve/frame"
import { handleArtifactStaticAssetRequest } from "./serve/http"
import { createSessionAuthorizationArgs } from "./serve/session"

describe("artifact render CSP", () => {
  test("allows only self when no Milo app origins are configured", () => {
    const policy = readArtifactFramePolicy({})

    expect(policy).toEqual({
      frameAncestors: ["'self'"],
      parentOrigins: [],
    })
    const csp = createArtifactRenderCsp(policy)

    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("font-src 'self' data:")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("media-src 'self' data: blob:")
    expect(csp).toContain("style-src 'self' 'unsafe-inline' blob:")
  })

  test("adds configured Milo app origins to frame ancestors", () => {
    const policy = readArtifactFramePolicy({
      MILO_ARTIFACT_FRAME_ANCESTORS:
        "http://localhost:5173, https://app.milo.example/",
    })

    expect(policy).toEqual({
      frameAncestors: [
        "'self'",
        "http://localhost:5173",
        "https://app.milo.example",
      ],
      parentOrigins: ["http://localhost:5173", "https://app.milo.example"],
    })
    expect(createArtifactRenderCsp(policy)).toContain(
      "frame-ancestors 'self' http://localhost:5173 https://app.milo.example"
    )
  })

  test("rejects non-origin frame ancestor values", () => {
    expect(() =>
      readArtifactFramePolicy({
        MILO_ARTIFACT_FRAME_ANCESTORS: "https://app.milo.example/artifacts",
      })
    ).toThrow("MILO_ARTIFACT_FRAME_ANCESTORS must contain origins only")

    expect(() =>
      readArtifactFramePolicy({
        MILO_ARTIFACT_FRAME_ANCESTORS: "*",
      })
    ).toThrow("MILO_ARTIFACT_FRAME_ANCESTORS must contain origins only")
  })
})

describe("artifact static assets", () => {
  test("serves the Vite-emitted Geist font path", async () => {
    const response = await handleArtifactStaticAssetRequest(
      new Request(
        "https://milo.example/assets/geist-latin-wght-normal-BgDaEnEv.woff2"
      )
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("font/woff2")
    expect(response.headers.get("cache-control")).toContain("immutable")
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  test("rejects unknown static asset paths", async () => {
    const response = await handleArtifactStaticAssetRequest(
      new Request("https://milo.example/assets/app.js")
    )

    expect(response.status).toBe(404)
  })
})

describe("artifact asset authorization", () => {
  test("maps session token payloads to validator-safe authorization args", () => {
    const args = createSessionAuthorizationArgs(
      {
        sessionId: "session" as Id<"artifactSessions">,
        artifactId: "artifact" as Id<"artifacts">,
        versionId: "version" as Id<"artifactVersions">,
        tenantId: "tenant",
        userId: "user",
        secret: "secret",
        expiresAt: 200,
      },
      100
    )

    expect(args).toEqual({
      sessionId: "session",
      artifactId: "artifact",
      versionId: "version",
      tenantId: "tenant",
      userId: "user",
      secret: "secret",
      tokenExpiresAt: 200,
      now: 100,
    })
    expect("expiresAt" in args).toBe(false)
  })
})
