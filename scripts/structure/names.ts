import { type Dirent } from "node:fs"
import path from "node:path"

export type NamingViolation = {
  relativePath: string
  segment: string
}

type NamingOptions = {
  isSkipped: (relativePath: string) => boolean
  isSource: (fileName: string) => boolean
}

const namingRoots = new Set([
  "contracts",
  "convex",
  "prompts",
  "scripts",
  "skills",
  "src",
  "test",
])
const conventionalSourcePaths = new Set([
  "convex/auth.config.ts",
  "src/hooks/use-mobile.ts",
  "src/routeTree.gen.ts",
])
const singleWordName = /^[a-z][a-z0-9]*$/

export function findNamingViolations(
  directory: string,
  entries: Dirent[],
  options: NamingOptions
) {
  if (!namingRoots.has(directory.split("/")[0])) {
    return []
  }

  return entries.flatMap((entry) => entryViolations(directory, entry, options))
}

function entryViolations(
  directory: string,
  entry: Dirent,
  options: NamingOptions
) {
  const relativePath = path.posix.join(directory, entry.name)

  if (entry.isDirectory()) {
    return options.isSkipped(relativePath) || singleWordName.test(entry.name)
      ? []
      : [{ relativePath, segment: entry.name }]
  }

  if (
    !entry.isFile() ||
    !options.isSource(entry.name) ||
    conventionalSourcePaths.has(relativePath)
  ) {
    return []
  }

  const sourceName = sourceBaseName(entry.name)

  return singleWordName.test(sourceName)
    ? []
    : [{ relativePath, segment: sourceName }]
}

function sourceBaseName(fileName: string) {
  let sourceName = fileName.slice(0, -path.extname(fileName).length)

  for (const suffix of [".config", ".d", ".test"]) {
    if (sourceName.endsWith(suffix)) {
      sourceName = sourceName.slice(0, -suffix.length)
    }
  }

  return sourceName
}

export function formatNamingViolation(violation: NamingViolation) {
  return `- ${violation.relativePath}: \`${violation.segment}\` is not a single word`
}
