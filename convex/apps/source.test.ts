import { describe, expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { canAccessApp } from "./access"
import {
  createSessionTokenPayload,
  readSessionTokenPayload,
} from "./serve/session"
import { createAppSourceSnapshot, hashAppSource } from "./source"
import { validateAppBuild } from "./source/build"
import { gitObjectId } from "./source/git"

describe("app source snapshots", () => {
  test("creates deterministic Git-compatible blob and tree IDs", () => {
    const first = createAppSourceSnapshot(minimalSource())
    const second = createAppSourceSnapshot([...minimalSource()].reverse())

    expect(first.treeId).toBe(second.treeId)
    expect(first.files.find((file) => file.path === "src/App.tsx")?.id).toBe(
      gitObjectId("blob", new TextEncoder().encode(appSource))
    )
  })

  test("changes the root tree when source content changes", () => {
    const first = createAppSourceSnapshot(minimalSource())
    const second = createAppSourceSnapshot(
      minimalSource({
        app: "export function App() { return <main>Changed</main> }\n",
      })
    )

    expect(first.treeId).not.toBe(second.treeId)
  })

  test("hashes source independently of input order", () => {
    const first = createAppSourceSnapshot(minimalSource())
    const second = createAppSourceSnapshot([...minimalSource()].reverse())

    expect(hashAppSource(first.files)).toBe(hashAppSource(second.files))
  })
})

describe("app source validation", () => {
  test("rejects missing required app file", () => {
    expect(() =>
      createAppSourceSnapshot(
        minimalSource().filter((file) => file.path !== "src/App.tsx")
      )
    ).toThrow("App source is missing src/App.tsx.")
  })

  test("rejects missing required contract file", () => {
    expect(() =>
      createAppSourceSnapshot(
        minimalSource().filter((file) => file.path !== "src/contract.ts")
      )
    ).toThrow("App source is missing src/contract.ts.")
  })

  test("rejects platform-owned template files", () => {
    expect(() =>
      createAppSourceSnapshot([
        ...minimalSource(),
        { path: "package.json", content: "{}\n" },
      ])
    ).toThrow("App source cannot include platform-owned file")
  })

  test("rejects platform-owned app UI kit files", () => {
    for (const path of [
      "src/components/ui/button.tsx",
      "src/lib/utils.ts",
      "src/milo/client.ts",
      "src/milo.ts",
      "src/milo.css",
    ]) {
      expect(() =>
        createAppSourceSnapshot([
          ...minimalSource(),
          { path, content: "export {}\n" },
        ])
      ).toThrow("App source cannot include platform-owned file")
    }
  })

  test("rejects unsafe source paths", () => {
    expect(() =>
      createAppSourceSnapshot([
        ...minimalSource(),
        { path: "../src/unsafe.ts", content: "export {}\n" },
      ])
    ).toThrow("App source path is not allowed")
    expect(() =>
      createAppSourceSnapshot([
        ...minimalSource(),
        {
          path: "node_modules/react/index.js",
          content: "export {}\n",
        },
      ])
    ).toThrow("App source cannot include node_modules.")
  })
})

describe("app access", () => {
  test("keeps personal apps owner-only", () => {
    const ownerId = id<"persons">("person_1")
    const otherId = id<"persons">("person_2")

    expect(canAccessApp(app("personal", ownerId), ownerId)).toBe(true)
    expect(canAccessApp(app("personal", ownerId), otherId)).toBe(false)
  })

  test("allows organization members to open organization apps", () => {
    const ownerId = id<"persons">("person_1")
    const otherId = id<"persons">("person_2")

    expect(canAccessApp(app("organization", ownerId), otherId)).toBe(true)
  })
})

describe("app build payloads", () => {
  test("accepts assets attested to the source snapshot", () => {
    const snapshot = createAppSourceSnapshot(minimalSource())
    const assets = validateAppBuild(snapshot.files, {
      sourceHash: hashAppSource(snapshot.files),
      assets: minimalBuildAssets(),
    })

    expect(assets.map((asset) => asset.path)).toEqual([
      "assets/app.js",
      "milo-manifest.json",
    ])
  })

  test("rejects builds for a different source snapshot", () => {
    const snapshot = createAppSourceSnapshot(minimalSource())

    expect(() =>
      validateAppBuild(snapshot.files, {
        sourceHash: "different",
        assets: minimalBuildAssets(),
      })
    ).toThrow("App build was not produced from this source.")
  })
})

describe("app session tokens", () => {
  test("round-trips token payloads", () => {
    const payload = {
      sessionId: "session" as Id<"appSessions">,
      organizationId: "organization",
      personId: "person" as Id<"persons">,
      appId: "app" as Id<"apps">,
      versionId: "version" as Id<"appVersions">,
      secret: "secret",
      expiresAt: 123,
    }

    expect(readSessionTokenPayload(createSessionTokenPayload(payload))).toEqual(
      payload
    )
  })

  test("rejects malformed token payloads", () => {
    expect(readSessionTokenPayload("not-json")).toBe(null)
  })
})

const appSource = "export function App() { return <main>Hello</main> }\n"
const contractSource =
  'import { defineAppContract } from "@/milo/contract"\nexport const contract = defineAppContract({ version: 1, state: {} })\n'

function minimalSource(overrides: { app?: string } = {}) {
  return [
    { path: "src/App.tsx", content: overrides.app ?? appSource },
    { path: "src/contract.ts", content: contractSource },
    { path: "src/styles.css", content: "main { display: block; }\n" },
  ]
}

function minimalBuildAssets() {
  return [
    {
      path: "assets/app.js",
      mimeType: "text/javascript; charset=utf-8",
      contentBase64: Buffer.from("export {}\n").toString("base64"),
    },
    {
      path: "milo-manifest.json",
      mimeType: "application/json; charset=utf-8",
      contentBase64: Buffer.from(
        JSON.stringify({ entry: "assets/app.js", styles: [] })
      ).toString("base64"),
    },
  ]
}

function app(
  access: Doc<"apps">["access"],
  ownerId: Id<"persons">
): Pick<Doc<"apps">, "access" | "ownerId"> {
  return { access, ownerId }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
