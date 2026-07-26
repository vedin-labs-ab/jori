import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { createAppRenderCsp, readAppFramePolicy } from "./serve/frame"
import { handleAppStaticAssetRequest } from "./serve/http"
import { createSessionAuthorizationArgs } from "./serve/session"

describe("app render CSP", () => {
  test("allows only self when no Jori app origins are configured", () => {
    const policy = readAppFramePolicy({})

    expect(policy).toEqual({
      frameAncestors: ["'self'"],
      parentOrigins: [],
    })
    const csp = createAppRenderCsp(policy)

    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("font-src 'self' data:")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("media-src 'self' data: blob:")
    expect(csp).toContain("style-src 'self' 'unsafe-inline' blob:")
  })

  test("adds configured Jori app origins to frame ancestors", () => {
    const policy = readAppFramePolicy({
      JORI_APP_FRAME_ANCESTORS:
        "http://localhost:5173, https://app.jori.example/",
    })

    expect(policy).toEqual({
      frameAncestors: [
        "'self'",
        "http://localhost:5173",
        "https://app.jori.example",
      ],
      parentOrigins: ["http://localhost:5173", "https://app.jori.example"],
    })
    expect(createAppRenderCsp(policy)).toContain(
      "frame-ancestors 'self' http://localhost:5173 https://app.jori.example"
    )
  })

  test("rejects non-origin frame ancestor values", () => {
    expect(() =>
      readAppFramePolicy({
        JORI_APP_FRAME_ANCESTORS: "https://app.jori.example/apps",
      })
    ).toThrow("JORI_APP_FRAME_ANCESTORS must contain origins only")

    expect(() =>
      readAppFramePolicy({
        JORI_APP_FRAME_ANCESTORS: "*",
      })
    ).toThrow("JORI_APP_FRAME_ANCESTORS must contain origins only")
  })
})

describe("app static assets", () => {
  test("serves the Vite-emitted Geist font path", async () => {
    const response = await handleAppStaticAssetRequest(
      new Request(
        "https://jori.example/assets/geist-latin-wght-normal-BgDaEnEv.woff2"
      )
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("font/woff2")
    expect(response.headers.get("cache-control")).toContain("immutable")
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  test("rejects unknown static asset paths", async () => {
    const response = await handleAppStaticAssetRequest(
      new Request("https://jori.example/assets/app.js")
    )

    expect(response.status).toBe(404)
  })
})

describe("app asset authorization", () => {
  test("maps session token payloads to validator-safe authorization args", () => {
    const args = createSessionAuthorizationArgs(
      {
        sessionId: "session" as Id<"appSessions">,
        appId: "app" as Id<"apps">,
        versionId: "version" as Id<"appVersions">,
        organizationId: "organization",
        personId: "person" as Id<"persons">,
        secret: "secret",
        expiresAt: 200,
      },
      100
    )

    expect(args).toEqual({
      sessionId: "session",
      appId: "app",
      versionId: "version",
      organizationId: "organization",
      personId: "person" as Id<"persons">,
      secret: "secret",
      tokenExpiresAt: 200,
      now: 100,
    })
    expect("expiresAt" in args).toBe(false)
  })
})
