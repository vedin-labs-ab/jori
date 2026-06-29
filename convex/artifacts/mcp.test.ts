import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { callMiloArtifactTool } from "./mcp"
import { createArtifactSourceSnapshot, hashArtifactSource } from "./source"
import { validateArtifactBuild } from "./source/build"

describe("artifact MCP publishing", () => {
  test("preserves source bytes validated by the sandbox builder", async () => {
    const source = [
      {
        path: "src/App.tsx",
        content: "export function App() { return <main>Hello</main> }\n",
      },
      {
        path: "src/contract.ts",
        content:
          'import { defineArtifactContract } from "@/milo/contract"\nexport const contract = defineArtifactContract({ version: 1, state: {} })\n',
      },
      {
        path: "src/styles.css",
        content: "main { display: block; }\n",
      },
    ]
    const snapshot = createArtifactSourceSnapshot(source)
    const build = {
      sourceHash: hashArtifactSource(snapshot.files),
      assets: minimalBuildAssets(),
    }
    let capturedSource: typeof source | undefined
    const ctx = {
      runAction: async (_action: unknown, args: { source: typeof source }) => {
        capturedSource = args.source
        const normalizedSnapshot = createArtifactSourceSnapshot(args.source)
        validateArtifactBuild(normalizedSnapshot.files, build)

        return args
      },
    }

    await callMiloArtifactTool(
      ctx as never,
      {
        tenantId: "tenant",
        createdBy: "person" as Id<"persons">,
      },
      {
        tool: "create_artifact",
        args: {
          title: "Inbox Triage Console",
          access: "personal",
          source,
          build,
        },
      }
    )

    expect(capturedSource?.map((file) => file.content)).toEqual(
      source.map((file) => file.content)
    )
  })
})

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
