import { readdir } from "node:fs/promises"
import path from "node:path"

type FolderCount = {
  count: number
  relativePath: string
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
  "dist",
  "node_modules",
  "convex/_generated",
  "runtime/source/artifact/template",
  "src/components/ui",
  "src/routes",
]

const counts = await countFolders(root)
const violations = counts
  .filter((folder) => folder.count > defaultLimit)
  .sort((left, right) =>
    right.count === left.count
      ? left.relativePath.localeCompare(right.relativePath)
      : right.count - left.count
  )

if (violations.length > 0) {
  process.stderr.write(formatViolations(violations))
  process.exitCode = 1
} else {
  process.stdout.write(
    `Folder structure check passed (${counts.length} folders scanned).\n`
  )
}

async function countFolders(directory: string): Promise<FolderCount[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const relativePath = toRelativePath(directory)
  const childCounts = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter((childPath) => !isSkipped(toRelativePath(childPath)))
      .map((childPath) => countFolders(childPath))
  )
  const directSourceFileCount = entries.filter(
    (entry) => entry.isFile() && isCountedSourceFile(entry.name)
  ).length
  const result = childCounts.flat()

  if (directSourceFileCount > 0 && !isSkipped(relativePath)) {
    result.push({
      count: directSourceFileCount,
      relativePath,
    })
  }

  return result
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
  return skippedDirectories.some(
    (skipped) =>
      relativePath === skipped || relativePath.startsWith(`${skipped}/`)
  )
}

function toRelativePath(directory: string) {
  const relativePath = path.relative(root, directory)

  return relativePath === "" ? "." : relativePath.split(path.sep).join("/")
}

function formatViolations(violations: FolderCount[]) {
  const lines = [
    "Folder structure check failed.",
    "",
    `Default limit: ${defaultLimit} direct source files per folder.`,
    "Tests, generated files, framework routes, shadcn/ui, and runtime templates are excluded.",
    "",
    ...violations.map(formatViolation),
    "",
    "Split crowded folders by domain, workflow, or responsibility.",
    "",
  ]

  return lines.join("\n")
}

function formatViolation(folder: FolderCount) {
  return `- ${folder.relativePath}: ${folder.count}/${defaultLimit}`
}
