import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, expect, test, vi } from "vitest"
import { readBuildAssets } from "../../runtime/artifacts/builder/assets.ts"

vi.mock("../../runtime/artifacts/builder/config.ts", () => ({
  config: { artifactTemplatePath: "" },
}))

const projects: string[] = []

afterEach(async () => {
  await Promise.all(
    projects.splice(0).map((project) =>
      fs.rm(project, {
        force: true,
        recursive: true,
      })
    )
  )
})

test("replaces a source manifest with one generated build asset", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "milo-assets-"))
  const assetsDirectory = path.join(project, "dist/assets")
  projects.push(project)
  await fs.mkdir(assetsDirectory, { recursive: true })
  await Promise.all([
    fs.writeFile(path.join(assetsDirectory, "app.js"), "export {}"),
    fs.writeFile(path.join(project, "dist/milo-manifest.json"), "stale"),
  ])

  const assets = await readBuildAssets(project)
  const manifests = assets.filter(
    (asset) => asset.path === "milo-manifest.json"
  )

  expect(manifests).toHaveLength(1)
  expect(readManifest(manifests[0]?.contentBase64)).toEqual({
    entry: "assets/app.js",
    styles: [],
  })
})

function readManifest(contentBase64: string | undefined) {
  if (contentBase64 === undefined) {
    throw new Error("Generated manifest is missing.")
  }

  return JSON.parse(Buffer.from(contentBase64, "base64").toString("utf8"))
}
