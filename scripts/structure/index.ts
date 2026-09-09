import { type Dirent } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"
import {
  findNamingViolations,
  formatNamingViolation,
  type NamingViolation,
} from "./names.ts"

type FolderCount = {
  count: number
  relativePath: string
}

type FolderScan = FolderCount & {
  hasChildSource: boolean
  hasSupportingSource: boolean
}

type StructureScan = {
  folders: FolderScan[]
  namingViolations: NamingViolation[]
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
  ".agents",
  ".claude",
  ".git",
  ".output",
  ".tanstack",
  "dist",
  "node_modules",
  "convex/_generated",
  "src/components/auth",
  "src/components/ui",
  "src/routes",
]

// Both paths are pinned by components.json, so shadcn decides what lands
// in them and how many files that is. App code belongs with the domain it
// serves, not here.
const allowedSingleFileFolders = ["src/hooks", "src/lib"]

const { folders: counts, namingViolations } = await scanFolders(root)

namingViolations.sort((left, right) =>
  left.relativePath.localeCompare(right.relativePath)
)

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

if (
  limitViolations.length > 0 ||
  singleFileViolations.length > 0 ||
  namingViolations.length > 0
) {
  process.stderr.write(
    formatViolations(limitViolations, singleFileViolations, namingViolations)
  )
  process.exitCode = 1
} else {
  process.stdout.write(
    `Folder structure check passed (${counts.length} folders scanned).\n`
  )
}

async function scanFolders(directory: string): Promise<StructureScan> {
  const entries = await readdir(directory, { withFileTypes: true })
  const relativePath = toRelativePath(directory)
  const childScanGroups = await scanChildren(directory, entries)
  const directSourceFileCount = countDirectSourceFiles(entries)
  const hasSupportingSource =
    entries.filter((entry) => entry.isFile() && isSourceFile(entry.name))
      .length > directSourceFileCount
  const hasChildSource = childScanGroups.some((scan) => scan.folders.length > 0)
  const folders = childScanGroups.flatMap((scan) => scan.folders)
  const namingViolations = [
    ...findNamingViolations(relativePath, entries, {
      isSkipped,
      isSource: isSourceFile,
    }),
    ...childScanGroups.flatMap((scan) => scan.namingViolations),
  ]

  if (directSourceFileCount > 0 && !isSkipped(relativePath)) {
    folders.push({
      count: directSourceFileCount,
      hasChildSource,
      hasSupportingSource,
      relativePath,
    })
  }

  return { folders, namingViolations }
}

async function scanChildren(directory: string, entries: Dirent[]) {
  return await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter((childPath) => !isSkipped(toRelativePath(childPath)))
      .map((childPath) => scanFolders(childPath))
  )
}

function countDirectSourceFiles(entries: Dirent[]) {
  return entries.filter(
    (entry) => entry.isFile() && isCountedSourceFile(entry.name)
  ).length
}

function isCountedSourceFile(fileName: string) {
  if (
    fileName === "generated.ts" ||
    fileName.endsWith(".test.ts") ||
    fileName.endsWith(".test.tsx") ||
    fileName.endsWith(".d.ts")
  ) {
    return false
  }

  return isSourceFile(fileName)
}

function isSourceFile(fileName: string) {
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
    !folder.hasSupportingSource &&
    !allowedSingleFileFolders.includes(folder.relativePath)
  )
}

function toRelativePath(directory: string) {
  const relativePath = path.relative(root, directory)

  return relativePath === "" ? "." : relativePath.split(path.sep).join("/")
}

function formatViolations(
  limitViolations: FolderCount[],
  singleFileViolations: FolderCount[],
  namingViolations: NamingViolation[]
) {
  const lines = [
    "Folder structure check failed.",
    "",
    `Default limit: ${defaultLimit} direct source files per folder.`,
    "Single-file leaf folders should be flattened into a source file.",
    "Tests, generated files, framework routes, shadcn/ui, and conventional framework files are excluded.",
    "",
    ...formatSection("Crowded folders", limitViolations, formatLimitViolation),
    ...formatSection(
      "Single-file folders",
      singleFileViolations,
      formatSingleFileViolation
    ),
    ...formatSection(
      "Compound source names",
      namingViolations,
      formatNamingViolation
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
