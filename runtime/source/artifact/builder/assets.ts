import fs from "node:fs/promises"
import path from "node:path"
import { listFiles, normalizeAssetPath } from "./files.ts"
import { type ArtifactBuildAsset, type ArtifactManifest } from "./types.ts"

export async function readBuildAssets(
  project: string
): Promise<ArtifactBuildAsset[]> {
  const dist = path.join(project, "dist")
  const paths = await listFiles(dist)
  const assetPaths = paths.map((assetPath) =>
    normalizeAssetPath(path.relative(dist, assetPath))
  )
  const manifest = createRuntimeManifest(assetPaths)
  const manifestPath = path.join(dist, "milo-manifest.json")

  await fs.writeFile(manifestPath, JSON.stringify(manifest), "utf8")

  const assets: ArtifactBuildAsset[] = []

  for (const assetPath of await listFiles(dist)) {
    const relativePath = normalizeAssetPath(path.relative(dist, assetPath))
    const bytes = await fs.readFile(assetPath)

    assets.push({
      path: relativePath,
      mimeType: inferAssetMimeType(relativePath),
      contentBase64: bytes.toString("base64"),
    })
  }

  return assets.sort((left, right) => left.path.localeCompare(right.path))
}

function createRuntimeManifest(assetPaths: string[]): ArtifactManifest {
  const normalized = assetPaths.map(normalizeAssetPath)
  const entry = normalized.find(
    (assetPath) => assetPath.startsWith("assets/") && assetPath.endsWith(".js")
  )

  if (entry === undefined) {
    throw new Error("Artifact build did not produce a JavaScript entry asset.")
  }

  return {
    entry,
    styles: normalized.filter(
      (assetPath) =>
        assetPath.startsWith("assets/") && assetPath.endsWith(".css")
    ),
  }
}

function inferAssetMimeType(assetPath: string) {
  if (assetPath.endsWith(".html")) {
    return "text/html; charset=utf-8"
  }

  if (assetPath.endsWith(".js")) {
    return "text/javascript; charset=utf-8"
  }

  if (assetPath.endsWith(".css")) {
    return "text/css; charset=utf-8"
  }

  if (assetPath.endsWith(".json")) {
    return "application/json; charset=utf-8"
  }

  if (assetPath.endsWith(".svg")) {
    return "image/svg+xml"
  }

  return "application/octet-stream"
}
