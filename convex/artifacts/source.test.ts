import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { canAccessArtifact } from "./access"
import { validateArtifactBuild } from "./build"
import { gitObjectId } from "./git"
import { createSessionTokenPayload, readSessionTokenPayload } from "./session"
import {
  createArtifactSourceSnapshot,
  hashArtifactSource,
  normalizeArtifactPath,
} from "./source"

describe("artifact source snapshots", () => {
  test("creates deterministic Git-compatible blob and tree IDs", () => {
    const first = createArtifactSourceSnapshot(minimalSource())
    const second = createArtifactSourceSnapshot([...minimalSource()].reverse())

    expect(first.treeId).toBe(second.treeId)
    expect(first.files.find((file) => file.path === "src/App.tsx")?.id).toBe(
      gitObjectId("blob", new TextEncoder().encode(appSource))
    )
  })

  test("changes the root tree when source content changes", () => {
    const first = createArtifactSourceSnapshot(minimalSource())
    const second = createArtifactSourceSnapshot(
      minimalSource({
        app: "export function App() { return <main>Changed</main> }\n",
      })
    )

    expect(first.treeId).not.toBe(second.treeId)
  })

  test("hashes source independently of input order", () => {
    const first = createArtifactSourceSnapshot(minimalSource())
    const second = createArtifactSourceSnapshot([...minimalSource()].reverse())

    expect(hashArtifactSource(first.files)).toBe(
      hashArtifactSource(second.files)
    )
  })
})

describe("artifact source validation", () => {
  test("rejects missing required app file", () => {
    expect(() =>
      createArtifactSourceSnapshot(
        minimalSource().filter((file) => file.path !== "src/App.tsx")
      )
    ).toThrow("Artifact source is missing src/App.tsx.")
  })

  test("rejects missing required contract file", () => {
    expect(() =>
      createArtifactSourceSnapshot(
        minimalSource().filter((file) => file.path !== "src/contract.ts")
      )
    ).toThrow("Artifact source is missing src/contract.ts.")
  })

  test("rejects platform-owned template files", () => {
    expect(() =>
      createArtifactSourceSnapshot([
        ...minimalSource(),
        { path: "package.json", content: "{}\n" },
      ])
    ).toThrow("Artifact source cannot include platform-owned file")
  })

  test("rejects platform-owned artifact UI kit files", () => {
    for (const path of [
      "src/components/ui/button.tsx",
      "src/lib/utils.ts",
      "src/milo/client.ts",
      "src/milo.ts",
      "src/milo.css",
    ]) {
      expect(() =>
        createArtifactSourceSnapshot([
          ...minimalSource(),
          { path, content: "export {}\n" },
        ])
      ).toThrow("Artifact source cannot include platform-owned file")
    }
  })

  test("rejects unsafe source paths", () => {
    expect(() => normalizeArtifactPath("../src/App.tsx")).toThrow(
      "Artifact source path is not allowed"
    )
    expect(() => normalizeArtifactPath("node_modules/react/index.js")).toThrow(
      "Artifact source cannot include node_modules."
    )
  })
})

describe("artifact access", () => {
  test("keeps personal artifacts owner-only", () => {
    expect(canAccessArtifact(artifact("personal", "user_1"), "user_1")).toBe(
      true
    )
    expect(canAccessArtifact(artifact("personal", "user_1"), "user_2")).toBe(
      false
    )
  })

  test("allows tenant members to open organization artifacts", () => {
    expect(
      canAccessArtifact(artifact("organization", "user_1"), "user_2")
    ).toBe(true)
  })
})

describe("artifact build payloads", () => {
  test("accepts assets attested to the source snapshot", () => {
    const snapshot = createArtifactSourceSnapshot(minimalSource())
    const assets = validateArtifactBuild(snapshot.files, {
      sourceHash: hashArtifactSource(snapshot.files),
      assets: minimalBuildAssets(),
    })

    expect(assets.map((asset) => asset.path)).toEqual([
      "assets/app.js",
      "milo-manifest.json",
    ])
  })

  test("rejects builds for a different source snapshot", () => {
    const snapshot = createArtifactSourceSnapshot(minimalSource())

    expect(() =>
      validateArtifactBuild(snapshot.files, {
        sourceHash: "different",
        assets: minimalBuildAssets(),
      })
    ).toThrow("Artifact build was not produced from this source.")
  })
})

describe("artifact session tokens", () => {
  test("round-trips token payloads", () => {
    const payload = {
      sessionId: "session" as Id<"artifactSessions">,
      tenantId: "tenant",
      userId: "user",
      artifactId: "artifact" as Id<"artifacts">,
      versionId: "version" as Id<"artifactVersions">,
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
  'import { defineArtifactContract } from "@/milo/contract"\nexport const contract = defineArtifactContract({ version: 1, state: {} })\n'

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

function artifact(
  access: Doc<"artifacts">["access"],
  ownerId: string
): Pick<Doc<"artifacts">, "access" | "ownerId"> {
  return { access, ownerId }
}
