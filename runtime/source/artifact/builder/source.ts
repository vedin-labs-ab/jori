import { createHash } from "node:crypto"
import {
  config,
  maxArtifactFileBytes,
  maxArtifactFiles,
  maxArtifactTreeBytes,
} from "./config.ts"
import { isPlatformSourcePath } from "./platform.ts"
import {
  type ArtifactSourceFile,
  type NormalizedArtifactSourceFile,
} from "./types.ts"

export function normalizeArtifactSource(
  source: unknown
): NormalizedArtifactSourceFile[] {
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error("Artifact source must include files.")
  }

  if (source.length > maxArtifactFiles) {
    throw new Error(`Artifacts can include at most ${maxArtifactFiles} files.`)
  }

  const paths = new Set<string>()
  const files = source.map((file) => normalizeSourceFile(file, paths))

  for (const requiredPath of config.requiredArtifactSourcePaths) {
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

export function rejectForbiddenSourceAccess(
  files: NormalizedArtifactSourceFile[]
) {
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

export function hashArtifactSource(files: NormalizedArtifactSourceFile[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        files.map((file) => ({
          path: file.path,
          content: file.content,
          executable: file.executable,
        }))
      )
    )
    .digest("hex")
}

function normalizeSourceFile(
  file: unknown,
  paths: Set<string>
): NormalizedArtifactSourceFile {
  if (typeof file !== "object" || file === null || Array.isArray(file)) {
    throw new Error("Artifact source files must be objects.")
  }

  const candidate = file as Partial<ArtifactSourceFile>
  const filePath = normalizeSourcePath(candidate.path)

  if (paths.has(filePath)) {
    throw new Error(`Duplicate artifact source path: ${filePath}`)
  }

  paths.add(filePath)

  if (typeof candidate.content !== "string") {
    throw new Error(`Artifact source file ${filePath} must be text.`)
  }

  const bytes = Buffer.from(candidate.content, "utf8")

  if (bytes.byteLength === 0) {
    throw new Error(`Artifact source file ${filePath} is empty.`)
  }

  if (bytes.byteLength > maxArtifactFileBytes) {
    throw new Error(
      `Artifact source file ${filePath} exceeds ${maxArtifactFileBytes} bytes.`
    )
  }

  return {
    path: filePath,
    content: candidate.content,
    executable: candidate.executable === true,
    byteSize: bytes.byteLength,
  }
}

function normalizeSourcePath(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Artifact source path must be a string.")
  }

  const normalized = value.trim().replaceAll("\\", "/")

  if (normalized === "") {
    throw new Error("Artifact source paths cannot be empty.")
  }

  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`Artifact source path must be relative: ${value}`)
  }

  const segments = normalized.split("/")

  if (segments.some(isForbiddenPathSegment)) {
    throw new Error(`Artifact source path is not allowed: ${value}`)
  }

  if (segments.some((segment) => segment === "node_modules")) {
    throw new Error("Artifact source cannot include node_modules.")
  }

  if (segments[0] === "dist") {
    throw new Error("Artifact source cannot include build output.")
  }

  const filePath = segments.join("/")

  if (isPlatformSourcePath(filePath)) {
    throw new Error(
      `Artifact source cannot include platform-owned file: ${filePath}`
    )
  }

  return filePath
}

function isForbiddenPathSegment(segment: string) {
  return (
    segment === "" ||
    segment === "." ||
    segment === ".." ||
    segment.includes("\0")
  )
}
