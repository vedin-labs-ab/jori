import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

type DriftRule = {
  message: string
  pattern: RegExp
}

type Violation = {
  line: number
  message: string
  relativePath: string
}

const root = process.cwd()
const sourceRoots = ["contracts", "convex", "src", "trigger"]
const sourceExtensions = new Set([".ts", ".tsx"])
const skippedPathParts = new Set([
  ".tanstack",
  "_generated",
  "dist",
  "node_modules",
])
const rules: DriftRule[] = [
  {
    message: "Use inputJson through contracts/transport.ts.",
    pattern: /\bargsJson\b/,
  },
  {
    message: "Use waitpointId.",
    pattern: /\bwaitpointTokenId\b/,
  },
]

const violations = (
  await Promise.all(sourceRoots.map((sourceRoot) => scan(sourceRoot)))
).flat()

if (violations.length === 0) {
  process.stdout.write("Contract drift check passed.\n")
} else {
  process.stderr.write(formatViolations(violations))
  process.exitCode = 1
}

async function scan(relativePath: string): Promise<Violation[]> {
  if (isSkipped(relativePath)) {
    return []
  }

  const absolutePath = path.join(root, relativePath)
  const entries = await readdir(absolutePath, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => scanEntry(relativePath, entry))
  )

  return nested.flat()
}

async function scanEntry(
  directory: string,
  entry: {
    isDirectory(): boolean
    isFile(): boolean
    name: string
  }
) {
  const relativePath = path.join(directory, entry.name)

  if (entry.isDirectory()) {
    return await scan(relativePath)
  }

  if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) {
    return []
  }

  return await checkFile(relativePath)
}

async function checkFile(relativePath: string) {
  const content = await readFile(path.join(root, relativePath), "utf8")
  const lines = content.split("\n")
  const violations: Violation[] = []

  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        violations.push({
          line: index + 1,
          message: rule.message,
          relativePath,
        })
      }
    }
  }

  return violations
}

function isSkipped(relativePath: string) {
  return relativePath.split(path.sep).some((part) => skippedPathParts.has(part))
}

function formatViolations(violations: Violation[]) {
  return [
    "Contract drift check failed.",
    "",
    ...violations.map(
      (violation) =>
        `- ${violation.relativePath}:${violation.line} ${violation.message}`
    ),
    "",
  ].join("\n")
}
