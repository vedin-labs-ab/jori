import { readdir, stat } from "node:fs/promises"
import { availableParallelism } from "node:os"
import path from "node:path"
import {
  type Command,
  packageCommand,
  runCommand,
  runCommands,
  runTasks,
} from "./process.ts"

const typeCheckedExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
])
// Keep this list aligned with the rules in biome.jsonc that belong to the
// `types` domain; the fast pass intentionally skips that domain.
const typeAwareRules = [
  "nursery/noFloatingPromises",
  "nursery/noMisusedPromises",
  "nursery/useExhaustiveSwitchCases",
  "nursery/useNullishCoalescing",
]
const ignoredDirectories = new Set([
  ".agents",
  ".claude",
  ".git",
  ".gstack",
  ".impeccable",
  ".output",
  ".tanstack",
  ".trigger",
  ".vinxi",
  ".wrangler",
  "dist",
  "dist-ssr",
  "node_modules",
])
const ignoredPaths = new Set([
  "src/components/auth",
  "src/components/ui",
  "src/routeTree.gen.ts",
])
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"

const mode = process.argv[2]

if (mode === undefined) {
  await runChecks()
} else if (mode === "biome") {
  await runBiomeChecks()
} else {
  throw new Error(`Unknown check mode: ${mode}`)
}

async function runChecks() {
  await runCommands([
    packageCommand("runtime:check"),
    packageCommand("templates:check"),
    packageCommand("content:compile"),
  ])

  await runTasks([
    runCommands([
      packageCommand("check:structure"),
      packageCommand("check:dependencies"),
      packageCommand("check:versions"),
      packageCommand("check:entrypoints"),
      packageCommand("check:drift"),
      packageCommand("check:typecheck"),
    ]),
    runBiomeChecks(),
  ])
}

async function runBiomeChecks() {
  await runCommand(
    biomeCommand("biome", ["ci", "--error-on-warnings", "--skip=types", "."])
  )

  const files = await collectTypeCheckedFiles(".")
  const shards = await balanceFiles(files, workerCount())

  await runCommands(
    shards.map((shard, index) =>
      biomeCommand(`Biome types ${index + 1}/${shards.length}`, [
        "lint",
        "--error-on-warnings",
        ...typeAwareRules.map((rule) => `--only=${rule}`),
        "--no-errors-on-unmatched",
        ...shard.files,
      ])
    )
  )
}

function biomeCommand(label: string, args: string[]): Command {
  return {
    args: ["exec", "biome", ...args],
    command: pnpm,
    label,
  }
}

async function collectTypeCheckedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(directory, entry.name)
      const normalizedPath = normalizePath(relativePath)

      if (entry.isDirectory()) {
        return shouldIgnoreDirectory(normalizedPath)
          ? []
          : await collectTypeCheckedFiles(relativePath)
      }

      if (
        !entry.isFile() ||
        ignoredPaths.has(normalizedPath) ||
        !typeCheckedExtensions.has(path.extname(entry.name))
      ) {
        return []
      }

      return [normalizedPath]
    })
  )

  return files.flat()
}

function shouldIgnoreDirectory(relativePath: string) {
  return (
    ignoredPaths.has(relativePath) ||
    relativePath
      .split("/")
      .some((part) => ignoredDirectories.has(part) || part === "_generated")
  )
}

function normalizePath(relativePath: string) {
  return relativePath.replace(/^\.\//, "").split(path.sep).join("/")
}

function workerCount() {
  const configured = Number.parseInt(process.env.MILO_CHECK_WORKERS ?? "", 10)
  const available = Number.isNaN(configured)
    ? availableParallelism()
    : configured

  return Math.max(1, Math.min(available, 4))
}

async function balanceFiles(files: string[], count: number) {
  const shards = Array.from(
    { length: Math.min(count, files.length) },
    (): { files: string[]; size: number } => ({ files: [], size: 0 })
  )
  const weightedFiles = await Promise.all(
    files.map(async (file) => ({ file, size: (await stat(file)).size }))
  )
  const groups = new Map<string, typeof weightedFiles>()

  for (const weightedFile of weightedFiles) {
    const key = affinityKey(weightedFile.file)
    const group = groups.get(key) ?? []

    group.push(weightedFile)
    groups.set(key, group)
  }

  const weightedGroups = [...groups.values()]
    .map((group) => ({
      files: group.map(({ file }) => file),
      size: group.reduce((total, { size }) => total + size, 0),
    }))
    .sort((left, right) => right.size - left.size)

  for (const group of weightedGroups) {
    const shard = shards.reduce((smallest, candidate) =>
      candidate.size < smallest.size ? candidate : smallest
    )

    shard.files.push(...group.files)
    shard.size += group.size
  }

  return shards
}

function affinityKey(file: string) {
  const parts = file.split("/")

  return parts[0] === "src" || parts[0] === "convex"
    ? parts.slice(0, 2).join("/")
    : parts[0]
}
