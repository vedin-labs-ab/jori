import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

type PublicFunction = {
  file: string
  line: number
  name: string
  block: string
}

type Violation = Omit<PublicFunction, "block">

// Every public Convex function is an internet-facing endpoint. Its
// registration block must go through one of these guards, which authenticate
// the caller and resolve organization/user scope server-side.
const sanctionedGuards = [
  "requireOrganizationAccess",
  "checkOrganizationAccess",
  "ensureCurrentPerson",
  "ensureCurrentPersonFromAction",
  "resolveCurrentPerson",
  "requireWorkerSecret",
  "getOrganizationIntegration",
  "getUserIntegration",
  "claimIntegrationOffer",
  "buildInstallState",
  "createSignedInstallState",
]

const root = process.cwd()
const convexRoot = path.join(root, "convex")
const registrationPattern = /(?<![\w.])(?:query|mutation|action)\(\s*\{/g
const guardPattern = new RegExp(`\\b(?:${sanctionedGuards.join("|")})\\b`)

const files = await collectSourceFiles(convexRoot)
const registrations = await collectPublicFunctions(files)
const violations = registrations
  .filter((registration) => !guardPattern.test(registration.block))
  .map(({ file, line, name }) => ({ file, line, name }))

if (violations.length > 0) {
  process.stderr.write(formatViolations(violations))
  process.exitCode = 1
} else {
  process.stdout.write(
    `Entrypoint guard check passed (${registrations.length} public functions scanned).\n`
  )
}

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const groups = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return entry.name === "_generated"
          ? []
          : await collectSourceFiles(entryPath)
      }

      return isCheckedSourceFile(entry.name) ? [entryPath] : []
    })
  )

  return groups.flat()
}

function isCheckedSourceFile(fileName: string) {
  return (
    fileName.endsWith(".ts") &&
    !fileName.endsWith(".test.ts") &&
    !fileName.endsWith(".d.ts")
  )
}

async function collectPublicFunctions(filePaths: string[]) {
  const results: PublicFunction[] = []

  for (const filePath of filePaths) {
    const source = await readFile(filePath, "utf8")

    for (const match of source.matchAll(registrationPattern)) {
      results.push(toPublicFunction(filePath, source, match.index))
    }
  }

  return results
}

function toPublicFunction(
  filePath: string,
  source: string,
  matchIndex: number
): PublicFunction {
  const before = source.slice(0, matchIndex)

  return {
    file: path.relative(root, filePath).split(path.sep).join("/"),
    line: before.split("\n").length,
    name: readExportName(before),
    block: readRegistrationBlock(source, matchIndex),
  }
}

// Biome formatting closes every top-level registration with `})` at column
// zero, so the block reliably ends at the first such line after the match.
function readRegistrationBlock(source: string, matchIndex: number) {
  const end = source.indexOf("\n})", matchIndex)

  return end === -1 ? source.slice(matchIndex) : source.slice(matchIndex, end)
}

function readExportName(before: string) {
  const exportMatch = /(?:export )?const (\w+) =\s*$/.exec(before)

  return exportMatch?.[1] ?? "<unknown>"
}

function formatViolations(violations: Violation[]) {
  return [
    "Entrypoint guard check failed.",
    "",
    "Public Convex functions are internet-facing endpoints. Each handler",
    "must authenticate and scope the caller through a sanctioned guard:",
    ...sanctionedGuards.map((guard) => `  - ${guard}`),
    "",
    "Unguarded public functions:",
    ...violations.map(
      (violation) => `  - ${violation.file}:${violation.line} ${violation.name}`
    ),
    "",
    "Use requireOrganizationAccess (console callers) or requireWorkerSecret",
    "(worker callers), or register the function as internal instead.",
    "",
  ].join("\n")
}
