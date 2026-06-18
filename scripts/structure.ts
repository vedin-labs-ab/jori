import { readdir } from "node:fs/promises"
import path from "node:path"

type FolderCount = {
  count: number
  relativePath: string
}

type FolderScan = FolderCount & {
  hasChildSource: boolean
  hasSource: boolean
}

type DirectoryEntry = {
  isDirectory(): boolean
  isFile(): boolean
  name: string
}

const root = process.cwd()
const defaultLimit = 12
const sourceExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
])

const skippedDirectories = [
  ".git",
  ".tanstack",
  "dist",
  "node_modules",
  "convex/_generated",
  "runtime/source/artifact/template",
  "src/components/ui",
  "src/routes",
]

const allowedSingleFileFolders = [
  ".",
  "runtime/source/artifact/shell",
  "src/hooks",
  "src/lib",
]

const counts = await countFolders(root)
const limitViolations = counts
  .filter((folder) => folder.count > defaultLimit)
  .sort((left, right) =>
    right.count === left.count
      ? left.relativePath.localeCompare(right.relativePath)
      : right.count - left.count
  )
const singleFileViolations = counts
  .filter(isSingleFileFolder)
  .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

if (limitViolations.length > 0 || singleFileViolations.length > 0) {
  process.stderr.write(formatViolations(limitViolations, singleFileViolations))
  process.exitCode = 1
} else {
  process.stdout.write(
    `Folder structure check passed (${counts.length} folders scanned).\n`
  )
}

async function countFolders(directory: string): Promise<FolderScan[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const relativePath = toRelativePath(directory)
  const childScanGroups = await scanChildren(directory, entries)
  const directSourceFileCount = countDirectSourceFiles(entries)
  const hasChildSource = childScanGroups.some((folders) =>
    folders.some((folder) => folder.hasSource)
  )
  const result = childScanGroups.flat()

  if (directSourceFileCount > 0 && !isSkipped(relativePath)) {
    result.push({
      count: directSourceFileCount,
      hasChildSource,
      hasSource: true,
      relativePath,
    })
  }

  return result
}

async function scanChildren(directory: string, entries: DirectoryEntry[]) {
  return await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter((childPath) => !isSkipped(toRelativePath(childPath)))
      .map((childPath) => countFolders(childPath))
  )
}

function countDirectSourceFiles(entries: DirectoryEntry[]) {
  return entries.filter(
    (entry) => entry.isFile() && isCountedSourceFile(entry.name)
  ).length
}

function isCountedSourceFile(fileName: string) {
  if (
    fileName.endsWith(".test.ts") ||
    fileName.endsWith(".test.tsx") ||
    fileName.endsWith(".d.ts")
  ) {
    return false
  }

  return sourceExtensions.has(path.extname(fileName))
}

function isSkipped(relativePath: string) {
  if (relativePath.split("/").includes("_generated")) {
    return true
  }

  return skippedDirectories.some(
    (skipped) =>
      relativePath === skipped || relativePath.startsWith(`${skipped}/`)
  )
}

function isSingleFileFolder(folder: FolderScan) {
  return (
    folder.count === 1 &&
    !folder.hasChildSource &&
    !allowedSingleFileFolders.includes(folder.relativePath)
  )
}

function toRelativePath(directory: string) {
  const relativePath = path.relative(root, directory)

  return relativePath === "" ? "." : relativePath.split(path.sep).join("/")
}

function formatViolations(
  limitViolations: FolderCount[],
  singleFileViolations: FolderCount[]
) {
  const lines = [
    "Folder structure check failed.",
    "",
    `Default limit: ${defaultLimit} direct source files per folder.`,
    "Single-file leaf folders should be flattened into a source file.",
    "Tests, generated files, framework routes, shadcn/ui, and runtime templates are excluded.",
    "",
    ...formatSection("Crowded folders", limitViolations, formatLimitViolation),
    ...formatSection(
      "Single-file folders",
      singleFileViolations,
      formatSingleFileViolation
    ),
    "",
    "Split crowded folders by domain, workflow, or responsibility. Flatten one-file leaf folders until supporting source files exist.",
    "",
  ]

  return lines.join("\n")
}

function formatSection<T>(
  title: string,
  violations: T[],
  formatViolation: (violation: T) => string
) {
  if (violations.length === 0) {
    return []
  }

  return [title, "", ...violations.map(formatViolation), ""]
}

function formatLimitViolation(folder: FolderCount) {
  return `- ${folder.relativePath}: ${folder.count}/${defaultLimit}`
}

function formatSingleFileViolation(folder: FolderCount) {
  return `- ${folder.relativePath}: ${folder.count} direct source file`
}
