import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { callMiloAppTool } from "./mcp"
import { createAppSourceSnapshot, hashAppSource } from "./source"
import { validateAppBuild } from "./source/build"

describe("app MCP publishing", () => {
  test("preserves source bytes validated by the sandbox builder", async () => {
    const source = [
      {
        path: "src/App.tsx",
        content: "export function App() { return <main>Hello</main> }\n",
      },
      {
        path: "src/contract.ts",
        content:
          'import { defineAppContract } from "@/milo/contract"\nexport const contract = defineAppContract({ version: 1, state: {} })\n',
      },
      {
        path: "src/styles.css",
        content: "main { display: block; }\n",
      },
    ]
    const snapshot = createAppSourceSnapshot(source)
    const build = {
      sourceHash: hashAppSource(snapshot.files),
      assets: minimalBuildAssets(),
    }
    let capturedSource: typeof source | undefined
    const ctx = {
      runAction: async (_action: unknown, args: { source: typeof source }) => {
        capturedSource = args.source
        const normalizedSnapshot = createAppSourceSnapshot(args.source)
        validateAppBuild(normalizedSnapshot.files, build)

        return args
      },
    }

    await callMiloAppTool(
      ctx as never,
      {
        organizationId: "organization",
        createdBy: "person" as Id<"persons">,
      },
      {
        tool: "create_app",
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
