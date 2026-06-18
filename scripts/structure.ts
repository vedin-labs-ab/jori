import { readdir } from "node:fs/promises"
import path from "node:path"

type FolderLimit = {
  limit: number
  reason?: string
}

type FolderCount = {
  count: number
  limit: number
  reason?: string
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

const ignoredDirectories = [
  ".git",
  "dist",
  "node_modules",
  "convex/_generated",
  "runtime/source/artifact/template",
  "src/components/ui",
  "src/routes",
]

const folderLimits = new Map<string, FolderLimit>([
  [
    "convex/artifacts",
    {
      limit: 34,
      reason: "known artifact domain hotspot; split before adding more files",
    },
  ],
  [
    "convex/automations",
    {
      limit: 16,
      reason: "known automation domain hotspot; split before adding more files",
    },
  ],
  [
    "src/console/artifacts",
    {
      limit: 14,
      reason: "known artifact console hotspot; split before adding more files",
    },
  ],
  [
    "src/console/skills",
    {
      limit: 13,
      reason: "known skills console hotspot; split before adding more files",
    },
  ],
])

const counts = await countFolders(root)
const violations = counts
  .filter((folder) => folder.count > folder.limit)
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
      .filter((childPath) => !isIgnored(toRelativePath(childPath)))
      .map((childPath) => countFolders(childPath))
  )
  const directSourceFileCount = entries.filter(
    (entry) => entry.isFile() && isCountedSourceFile(entry.name)
  ).length
  const result = childCounts.flat()

  if (directSourceFileCount > 0 && !isIgnored(relativePath)) {
    result.push({
      count: directSourceFileCount,
      limit: limitFor(relativePath).limit,
      reason: limitFor(relativePath).reason,
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

function limitFor(relativePath: string): FolderLimit {
  return (
    folderLimits.get(relativePath) ?? {
      limit: defaultLimit,
      reason: undefined,
    }
  )
}

function isIgnored(relativePath: string) {
  return ignoredDirectories.some(
    (ignored) =>
      relativePath === ignored || relativePath.startsWith(`${ignored}/`)
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
    "Split crowded folders by domain, workflow, or responsibility, or add a documented exception when the folder is intentionally flat.",
    "",
  ]

  return lines.join("\n")
}

function formatViolation(folder: FolderCount) {
  const reason = folder.reason === undefined ? "" : ` (${folder.reason})`

  return `- ${folder.relativePath}: ${folder.count}/${folder.limit}${reason}`
}
