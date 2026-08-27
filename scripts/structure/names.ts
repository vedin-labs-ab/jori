import { type Dirent } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"

export type NamingViolation = {
  relativePath: string
  segment: string
}

type NamingOptions = {
  isSkipped: (relativePath: string) => boolean
  isSource: (fileName: string) => boolean
  root: string
}

const namingRoots = new Set([
  "contracts",
  "convex",
  "prompts",
  "scripts",
  "src",
  "test",
  "trigger",
])
const conventionalSourcePaths = new Set([
  "convex/auth.config.ts",
  "src/hooks/use-mobile.ts",
  "src/routeTree.gen.ts",
])
const singleWordName = /^[a-z][a-z0-9]*$/

export async function findNamingViolations(options: NamingOptions) {
  const entries = await readdir(options.root, { withFileTypes: true })
  const roots = entries
    .filter((entry) => entry.isDirectory() && namingRoots.has(entry.name))
    .map((entry) => path.join(options.root, entry.name))
  const groups = await Promise.all(
    roots.map((directory) => scanNames(directory, options))
  )

  return groups
    .flat()
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

async function scanNames(
  directory: string,
  options: NamingOptions
): Promise<NamingViolation[]> {
  const relativePath = toRelativePath(directory, options.root)

  if (options.isSkipped(relativePath)) {
    return []
  }

  const entries = await readdir(directory, { withFileTypes: true })
  const violations = entries.flatMap((entry) =>
    entryViolations(directory, entry, options)
  )
  const childGroups = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter(
        (childPath) =>
          !options.isSkipped(toRelativePath(childPath, options.root))
      )
      .map((childPath) => scanNames(childPath, options))
  )

  return [...violations, ...childGroups.flat()]
}

function entryViolations(
  directory: string,
  entry: Dirent,
  options: NamingOptions
) {
  const entryPath = path.join(directory, entry.name)
  const relativePath = toRelativePath(entryPath, options.root)

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

function toRelativePath(target: string, root: string) {
  return path.relative(root, target).split(path.sep).join("/")
}

export function formatNamingViolation(violation: NamingViolation) {
  return `- ${violation.relativePath}: \`${violation.segment}\` is not a single word`
}
