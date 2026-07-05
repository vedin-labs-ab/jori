import { createHash } from "node:crypto"
import {
  artifactSourceHashInput,
  maxArtifactFileBytes,
  maxArtifactFiles,
  maxArtifactTreeBytes,
  normalizeArtifactSourcePath,
  rejectForbiddenSourceAccess,
} from "../../../../contracts/artifacts/source.ts"
import { config } from "./config.ts"
import { isPlatformSourcePath } from "./platform.ts"
import {
  type ArtifactSourceFile,
  type NormalizedArtifactSourceFile,
} from "./types.ts"

export { rejectForbiddenSourceAccess } from "../../../../contracts/artifacts/source.ts"

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

export function hashArtifactSource(files: NormalizedArtifactSourceFile[]) {
  return createHash("sha256")
    .update(artifactSourceHashInput(files))
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

  const filePath = normalizeArtifactSourcePath(value)

  if (isPlatformSourcePath(filePath)) {
    throw new Error(
      `Artifact source cannot include platform-owned file: ${filePath}`
    )
  }

  return filePath
}
