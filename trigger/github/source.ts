import { toJsonObject } from "../../contracts/json"
import {
  maxSourceChangeFileBytes,
  maxSourceChangeFiles,
  maxSourceChangeTreeBytes,
  normalizeSourceChanges,
} from "../../contracts/source"
import { optionalString, requiredString } from "../input"
import { sandboxClonePath } from "../sandbox/path"
import { type ToolRuntime } from "../tool"
import { type JsonObject } from "../types"

const sourceChangeTools = new Set([
  "github_commit_to_pull_request",
  "github_create_pull_request",
])

export async function prepareProviderToolInput(
  runtime: ToolRuntime,
  surface: string,
  tool: string,
  input: JsonObject
) {
  if (surface !== "github" || !sourceChangeTools.has(tool)) {
    return input
  }

  if (tool === "github_create_pull_request" && shouldUseExistingHead(input)) {
    return input
  }

  const changes =
    input.changes === undefined
      ? await collectSourceChanges(runtime, input)
      : normalizeSourceChanges(input.changes)
  const output: JsonObject = {
    ...input,
    changes: toJsonObject(changes),
  }

  if (
    tool === "github_create_pull_request" &&
    optionalString(input.branch) === undefined
  ) {
    output.branch = defaultBranchName(runtime.context.run.id)
  }

  return output
}

async function collectSourceChanges(runtime: ToolRuntime, input: JsonObject) {
  const result = await runtime.sandbox.runCommand({
    command: sourceChangeScript(readPathFilters(input.paths)),
    cwd: sourceDirectory(input),
    timeoutMs: 30_000,
  })

  if (result.exitCode !== 0) {
    throw new Error(compactError(result.stderr, result.stdout))
  }

  try {
    return normalizeSourceChanges(JSON.parse(result.stdout))
  } catch (error) {
    throw new Error(
      `Could not read local source changes: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function shouldUseExistingHead(input: JsonObject) {
  return input.changes === undefined && optionalString(input.head) !== undefined
}

function sourceDirectory(input: JsonObject) {
  return sandboxClonePath({
    repository: `${requiredString(input.owner, "owner")}/${requiredString(input.repo, "repo")}`,
    value: optionalString(input.directory),
  })
}

function readPathFilters(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function defaultBranchName(runId: string) {
  const suffix = runId
    .replaceAll(/[^A-Za-z0-9._/-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 96)

  return `milo/${suffix === "" ? "change" : suffix}`
}

function compactError(stderr: string, stdout: string) {
  const output = [stderr, stdout]
    .map((value) => value.trim())
    .filter((value) => value !== "")
    .join("\n")

  return output === "" ? "Could not read local source changes." : output
}

function sourceChangeScript(paths: string[]) {
  return `node --input-type=module <<'MILO_SOURCE_CHANGES'
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const pathFilters = ${JSON.stringify(paths)}
const maxFiles = ${maxSourceChangeFiles}
const maxFileBytes = ${maxSourceChangeFileBytes}
const maxTreeBytes = ${maxSourceChangeTreeBytes}
const decoder = new TextDecoder("utf-8", { fatal: true })

try {
  const root = git(["rev-parse", "--show-toplevel"]).trim()
  const headSha = git(["rev-parse", "HEAD"]).trim()
  const status = git([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    ...(pathFilters.length === 0 ? [] : ["--", ...pathFilters]),
  ])
  const files = readChanges(root, status)

  if (files.length === 0) {
    throw new Error("No local source changes found.")
  }

  process.stdout.write(JSON.stringify({ files, headSha }))
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function git(args) {
  const result = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" })

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || \`git \${args[0]} failed\`)
  }

  return result.stdout
}

function readChanges(root, status) {
  const files = []
  const entries = status.split("\\0").filter((entry) => entry !== "")
  let bytes = 0

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    const code = entry.slice(0, 2)
    const sourcePath = normalizeSourcePath(entry.slice(3))

    if (isUnmerged(code)) {
      throw new Error(\`Cannot publish unresolved merge conflict: \${sourcePath}\`)
    }

    if (code[0] === "R" || code[0] === "C") {
      index += 1
    }

    const file = readChange(root, sourcePath)
    files.push(file)

    if (files.length > maxFiles) {
      throw new Error(\`Source changes can include at most \${maxFiles} files.\`)
    }

    if (file.operation === "upsert") {
      const fileBytes = Buffer.byteLength(file.content, "utf8")

      if (fileBytes > maxFileBytes) {
        throw new Error(\`Source file \${file.path} exceeds \${maxFileBytes} bytes.\`)
      }

      bytes += fileBytes
    }
  }

  if (bytes > maxTreeBytes) {
    throw new Error(\`Source changes exceed \${maxTreeBytes} total bytes.\`)
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function readChange(root, sourcePath) {
  const filePath = workspacePath(root, sourcePath)

  if (!fs.existsSync(filePath)) {
    return { operation: "delete", path: sourcePath }
  }

  const stat = fs.lstatSync(filePath)

  if (stat.isSymbolicLink()) {
    throw new Error(\`Cannot publish symbolic link: \${sourcePath}\`)
  }

  if (!stat.isFile()) {
    throw new Error(\`Cannot publish non-file path: \${sourcePath}\`)
  }

  const bytes = fs.readFileSync(filePath)

  if (bytes.includes(0)) {
    throw new Error(\`Cannot publish binary file: \${sourcePath}\`)
  }

  let content

  try {
    content = decoder.decode(bytes)
  } catch {
    throw new Error(\`Cannot publish non-UTF-8 file: \${sourcePath}\`)
  }

  return {
    content,
    ...(stat.mode & 0o111 ? { executable: true } : {}),
    operation: "upsert",
    path: sourcePath,
  }
}

function normalizeSourcePath(value) {
  const normalized = value.trim().replaceAll("\\\\", "/")

  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    normalized.endsWith("/")
  ) {
    throw new Error(\`Invalid source path: \${value}\`)
  }

  const segments = normalized.split("/")

  if (
    segments.some((segment) =>
      segment === "" ||
      segment === "." ||
      segment === ".." ||
      segment === ".git" ||
      segment === "node_modules"
    )
  ) {
    throw new Error(\`Invalid source path: \${value}\`)
  }

  return segments.join("/")
}

function workspacePath(root, sourcePath) {
  const target = path.resolve(root, sourcePath)
  const relative = path.relative(root, target)

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(\`Source path escapes repository: \${sourcePath}\`)
  }

  return target
}

function isUnmerged(code) {
  return (
    code.includes("U") ||
    code === "AA" ||
    code === "DD"
  )
}
MILO_SOURCE_CHANGES`
}
