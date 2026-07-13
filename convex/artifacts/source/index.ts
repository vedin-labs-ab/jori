"use node"

import { createHash } from "node:crypto"
import {
  type ArtifactSourceFile,
  artifactSourceHashInput,
  normalizeArtifactSourceFiles,
} from "../../../contracts/artifacts/source"
import { type Id } from "../../_generated/dataModel"
import { buildGitTreeSnapshot, gitObjectId } from "./git"

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

function normalizeArtifactSource(source: ArtifactSourceFile[]) {
  return normalizeArtifactSourceFiles(source).map((file) => {
    const bytes = new TextEncoder().encode(file.content)

    return {
      path: file.path,
      content: file.content,
      bytes,
      mode: file.executable === true ? "executable" : "file",
      mimeType: inferSourceMimeType(file.path),
      byteSize: file.byteSize,
      id: gitObjectId("blob", bytes),
    } satisfies NormalizedArtifactSourceFile
  })
}

export function hashArtifactSource(files: NormalizedArtifactSourceFile[]) {
  return createHash("sha256")
    .update(
      artifactSourceHashInput(
        files.map((file) => ({
          path: file.path,
          content: file.content,
          executable: file.mode === "executable",
        }))
      )
    )
    .digest("hex")
}

function inferSourceMimeType(path: string) {
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
