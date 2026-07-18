import { compactRecord, isRecord } from "./json"
export const maxSourceChangeFiles = 100
export const maxSourceChangeFileBytes = 256 * 1024
export const maxSourceChangeTreeBytes = 900 * 1024

export type SourceFileChange =
  | {
      content: string
      executable?: boolean
      operation: "upsert"
      path: string
    }
  | {
      operation: "delete"
      path: string
    }

export type SourceChanges = {
  baseSha?: string
  files: SourceFileChange[]
  headSha?: string
}

export function normalizeSourceChanges(value: unknown): SourceChanges {
  if (!isRecord(value)) {
    throw new Error("changes is required")
  }

  const files = readFiles(value.files)
  const baseSha = optionalSha(value.baseSha, "changes.baseSha")
  const headSha = optionalSha(value.headSha, "changes.headSha")

  return compactRecord({ baseSha, files, headSha })
}

function normalizeSourcePath(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("source path must be a string")
  }

  const normalized = value.trim().replaceAll("\\", "/")

  if (normalized === "") {
    throw new Error("source path cannot be empty")
  }

  if (normalized.startsWith("/") || normalized.endsWith("/")) {
    throw new Error(`source path must be relative: ${value}`)
  }

  const segments = normalized.split("/")

  if (segments.some(isForbiddenPathSegment)) {
    throw new Error(`source path is not allowed: ${value}`)
  }

  if (segments.some((segment) => segment === ".git")) {
    throw new Error("source changes cannot include .git paths")
  }

  if (segments.some((segment) => segment === "node_modules")) {
    throw new Error("source changes cannot include node_modules")
  }

  return segments.join("/")
}

function readFiles(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("changes.files must include at least one file")
  }

  if (value.length > maxSourceChangeFiles) {
    throw new Error(
      `source changes can include at most ${maxSourceChangeFiles} files`
    )
  }

  const paths = new Set<string>()
  let bytes = 0
  const files = value.map((file, index) => {
    const change = readFile(file, `changes.files[${index}]`)

    if (paths.has(change.path)) {
      throw new Error(`duplicate source path: ${change.path}`)
    }

    paths.add(change.path)

    if (change.operation === "upsert") {
      const fileBytes = textBytes(change.content)

      if (fileBytes > maxSourceChangeFileBytes) {
        throw new Error(
          `source file ${change.path} exceeds ${maxSourceChangeFileBytes} bytes`
        )
      }

      bytes += fileBytes
    }

    return change
  })

  if (bytes > maxSourceChangeTreeBytes) {
    throw new Error(
      `source changes exceed ${maxSourceChangeTreeBytes} total bytes`
    )
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function readFile(value: unknown, path: string): SourceFileChange {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`)
  }

  const operation = value.operation
  const filePath = normalizeSourcePath(value.path)

  if (operation === "delete") {
    return {
      operation,
      path: filePath,
    }
  }

  if (operation !== "upsert") {
    throw new Error(`${path}.operation must be upsert or delete`)
  }

  if (typeof value.content !== "string") {
    throw new Error(`${path}.content is required`)
  }

  return {
    content: value.content,
    ...(value.executable === true ? { executable: true } : {}),
    operation,
    path: filePath,
  }
}

function optionalSha(value: unknown, name: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value !== "string" || !/^[0-9a-f]{7,64}$/i.test(value)) {
    throw new Error(`${name} must be a Git object SHA`)
  }

  return value
}

function textBytes(value: string) {
  return new TextEncoder().encode(value).byteLength
}

function isForbiddenPathSegment(segment: string) {
  return segment === "" || segment === "." || segment === ".."
}
