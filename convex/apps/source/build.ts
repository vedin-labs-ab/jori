"use node"

import path from "node:path"
import { hashAppSource, type NormalizedAppSourceFile } from "."

export type AppBuildInput = {
  sourceHash: string
  assets: AppBuildAssetInput[]
}

type AppBuildAssetInput = {
  path: string
  mimeType: string
  contentBase64: string
}

export type BuildAsset = {
  path: string
  mimeType: string
  byteSize: number
  bytes: Buffer
}

const manifestPath = "milo-manifest.json"
const maxBuildAssets = 120
const maxBuildAssetBytes = 2 * 1024 * 1024
const maxBuildBytes = 8 * 1024 * 1024

export function validateAppBuild(
  files: NormalizedAppSourceFile[],
  build: AppBuildInput
) {
  const sourceHash = hashAppSource(files)

  if (build.sourceHash !== sourceHash) {
    throw new Error("App build was not produced from this source.")
  }

  if (build.assets.length === 0) {
    throw new Error("App build must include assets.")
  }

  if (build.assets.length > maxBuildAssets) {
    throw new Error(`App build can include at most ${maxBuildAssets} assets.`)
  }

  const paths = new Set<string>()
  const assets = build.assets.map((asset) => {
    const assetPath = normalizeAssetPath(asset.path)

    if (paths.has(assetPath)) {
      throw new Error(`Duplicate app build asset path: ${assetPath}`)
    }

    paths.add(assetPath)

    const bytes = Buffer.from(asset.contentBase64, "base64")

    if (bytes.byteLength === 0) {
      throw new Error(`App build asset ${assetPath} is empty.`)
    }

    if (bytes.byteLength > maxBuildAssetBytes) {
      throw new Error(
        `App build asset ${assetPath} exceeds ${maxBuildAssetBytes} bytes.`
      )
    }

    return {
      path: assetPath,
      mimeType: normalizeMimeType(asset.mimeType, assetPath),
      byteSize: bytes.byteLength,
      bytes,
    } satisfies BuildAsset
  })

  const totalBytes = assets.reduce((sum, asset) => sum + asset.byteSize, 0)

  if (totalBytes > maxBuildBytes) {
    throw new Error(`App build exceeds ${maxBuildBytes} total bytes.`)
  }

  validateManifest(assets)

  return assets.sort((left, right) => left.path.localeCompare(right.path))
}

function validateManifest(assets: BuildAsset[]) {
  const manifest = assets.find((asset) => asset.path === manifestPath)

  if (manifest === undefined) {
    throw new Error("App build is missing milo-manifest.json.")
  }

  const parsed = JSON.parse(manifest.bytes.toString("utf8")) as {
    entry?: unknown
    styles?: unknown
  }

  if (typeof parsed.entry !== "string") {
    throw new Error("App build manifest is missing an entry asset.")
  }

  const assetPaths = new Set(assets.map((asset) => asset.path))

  if (!assetPaths.has(parsed.entry)) {
    throw new Error("App build manifest entry asset is missing.")
  }

  if (!parsed.entry.startsWith("assets/") || !parsed.entry.endsWith(".js")) {
    throw new Error("App build manifest entry must be a JavaScript asset.")
  }

  if (
    parsed.styles !== undefined &&
    (!Array.isArray(parsed.styles) ||
      !parsed.styles.every(
        (style) =>
          typeof style === "string" &&
          style.startsWith("assets/") &&
          style.endsWith(".css") &&
          assetPaths.has(style)
      ))
  ) {
    throw new Error("App build manifest styles are invalid.")
  }
}

function normalizeAssetPath(assetPath: string) {
  const normalized = assetPath.trim().replaceAll("\\", "/")

  if (normalized === "") {
    throw new Error("App build asset paths cannot be empty.")
  }

  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`App build asset path must be relative: ${assetPath}`)
  }

  const segments = normalized.split("/")

  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\0")
    )
  ) {
    throw new Error(`App build asset path is not allowed: ${assetPath}`)
  }

  return segments.join("/")
}

function normalizeMimeType(mimeType: string, assetPath: string) {
  const trimmed = mimeType.trim()

  if (trimmed !== "") {
    return trimmed
  }

  return inferAssetMimeType(assetPath)
}

function inferAssetMimeType(assetPath: string) {
  const extension = path.extname(assetPath).toLowerCase()

  if (extension === ".html") {
    return "text/html; charset=utf-8"
  }

  if (extension === ".js") {
    return "text/javascript; charset=utf-8"
  }

  if (extension === ".css") {
    return "text/css; charset=utf-8"
  }

  if (extension === ".json") {
    return "application/json; charset=utf-8"
  }

  if (extension === ".svg") {
    return "image/svg+xml"
  }

  return "application/octet-stream"
}
