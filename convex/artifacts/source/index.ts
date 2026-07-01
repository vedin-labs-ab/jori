"use node"

import { createHash } from "node:crypto"
import {
  isPlatformArtifactSourcePath,
  requiredArtifactSourcePaths,
} from "../../../contracts/artifacts/source"
import { type Id } from "../../_generated/dataModel"
import { buildGitTreeSnapshot, gitObjectId } from "./git"

export type ArtifactSourceFile = {
  path: string
  content: string
  executable?: boolean
}

export type NormalizedArtifactSourceFile = {
  path: string
  content: string
  bytes: Uint8Array
  mode: "file" | "executable"
  mimeType: string
  byteSize: number
  id: string
}

export type ArtifactTreeRecord = {
  id: string
  entries: Array<{
    name: string
    mode: "directory" | "file" | "executable"
    id: string
  }>
}

export type ArtifactSourceSnapshot = {
  files: NormalizedArtifactSourceFile[]
  treeId: string
  trees: ArtifactTreeRecord[]
}

export type StoredArtifactBlob = Pick<
  NormalizedArtifactSourceFile,
  "byteSize" | "id" | "mimeType"
> & {
  storageId: Id<"_storage">
}

const maxArtifactFiles = 120
const maxArtifactFileBytes = 512 * 1024
const maxArtifactTreeBytes = 2 * 1024 * 1024

export function createArtifactSourceSnapshot(
  source: ArtifactSourceFile[]
): ArtifactSourceSnapshot {
  const files = normalizeArtifactSource(source)
  const tree = buildGitTreeSnapshot(files)

  return {
    files,
    treeId: tree.treeId,
    trees: tree.trees,
  }
}

export function normalizeArtifactSource(source: ArtifactSourceFile[]) {
  if (source.length === 0) {
    throw new Error("Artifact source must include files.")
  }

  if (source.length > maxArtifactFiles) {
    throw new Error(`Artifacts can include at most ${maxArtifactFiles} files.`)
  }

  const paths = new Set<string>()
  const files = source.map((file) => {
    const path = normalizeArtifactPath(file.path)

    if (paths.has(path)) {
      throw new Error(`Duplicate artifact source path: ${path}`)
    }

    paths.add(path)

    if (typeof file.content !== "string") {
      throw new Error(`Artifact source file ${path} must be text.`)
    }

    const bytes = new TextEncoder().encode(file.content)

    if (bytes.byteLength === 0) {
      throw new Error(`Artifact source file ${path} is empty.`)
    }

    if (bytes.byteLength > maxArtifactFileBytes) {
      throw new Error(
        `Artifact source file ${path} exceeds ${maxArtifactFileBytes} bytes.`
      )
    }

    return {
      path,
      content: file.content,
      bytes,
      mode: file.executable === true ? "executable" : "file",
      mimeType: inferSourceMimeType(path),
      byteSize: bytes.byteLength,
      id: gitObjectId("blob", bytes),
    } satisfies NormalizedArtifactSourceFile
  })

  for (const requiredPath of requiredArtifactSourcePaths) {
    if (!paths.has(requiredPath)) {
      throw new Error(`Artifact source is missing ${requiredPath}.`)
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.byteSize, 0)

  if (totalBytes > maxArtifactTreeBytes) {
    throw new Error(
      `Artifact source exceeds ${maxArtifactTreeBytes} total bytes.`
    )
  }

  const sortedFiles = files.sort((left, right) =>
    left.path.localeCompare(right.path)
  )

  rejectForbiddenSourceAccess(sortedFiles)

  return sortedFiles
}

export function normalizeArtifactPath(path: string) {
  const normalized = path.trim().replaceAll("\\", "/")

  if (normalized === "") {
    throw new Error("Artifact source paths cannot be empty.")
  }

  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`Artifact source path must be relative: ${path}`)
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
    throw new Error(`Artifact source path is not allowed: ${path}`)
  }

  if (segments.some((segment) => segment === "node_modules")) {
    throw new Error("Artifact source cannot include node_modules.")
  }

  if (segments[0] === "dist") {
    throw new Error("Artifact source cannot include build output.")
  }

  if (isPlatformArtifactSourcePath(segments.join("/"))) {
    throw new Error(
      `Artifact source cannot include platform-owned file: ${segments.join("/")}`
    )
  }

  return segments.join("/")
}

export function hashArtifactSource(files: NormalizedArtifactSourceFile[]) {
  const hash = createHash("sha256")

  hash.update(
    JSON.stringify(
      files.map((file) => ({
        path: file.path,
        content: file.content,
        executable: file.mode === "executable",
      }))
    )
  )

  return hash.digest("hex")
}

function rejectForbiddenSourceAccess(files: NormalizedArtifactSourceFile[]) {
  const forbiddenPatterns = [
    /\bconvex\/react\b/,
    /\b@clerk\b/,
    /\bprocess\.env\b/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
  ]

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) {
      continue
    }

    const match = forbiddenPatterns.find((pattern) =>
      pattern.test(file.content)
    )

    if (match !== undefined) {
      throw new Error(
        `Artifact source file ${file.path} uses a forbidden platform API. Use the Milo SDK instead.`
      )
    }
  }
}

export function inferSourceMimeType(path: string) {
  if (path.endsWith(".json")) {
    return "application/json"
  }

  if (path.endsWith(".ts") || path.endsWith(".tsx")) {
    return "text/typescript"
  }

  if (path.endsWith(".js") || path.endsWith(".mjs")) {
    return "text/javascript"
  }

  if (path.endsWith(".css")) {
    return "text/css"
  }

  if (path.endsWith(".md")) {
    return "text/markdown"
  }

  return "text/plain"
}
