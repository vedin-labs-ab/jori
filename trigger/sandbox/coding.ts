import { type CodingToolName, isCodingToolName } from "../../contracts/coding"
import { sandboxWorkspace } from "../../contracts/runtime"
import { readWorkspaceFile } from "./files"
import {
  boundedTimeoutMs,
  normalizeToolInput,
  optionalTrimmedString,
  requiredTrimmedString,
} from "./input"
import { boundedText } from "./output"
import { applyWorkspacePatch } from "./patch/apply"
import { sandboxWorkspacePath, shellQuote } from "./path"
import { gitBashGuard, readOnlyGitCommand } from "./script"
import { globWorkspace, grepWorkspace } from "./search"
import { type SandboxRuntime } from "./types"

export async function executeCodingTool(args: {
  input: unknown
  sandbox: SandboxRuntime
  tool: string
}) {
  if (!isCodingToolName(args.tool)) {
    throw new Error(`Unknown sandbox tool: ${args.tool}`)
  }

  return await executeKnownCodingTool({
    input: normalizeToolInput(args.input),
    sandbox: args.sandbox,
    tool: args.tool,
  })
}

async function executeKnownCodingTool(args: {
  input: Record<string, unknown>
  sandbox: SandboxRuntime
  tool: CodingToolName
}) {
  switch (args.tool) {
    case "read":
      return await readWorkspaceFile(args.sandbox, args.input)
    case "grep":
      return await grepWorkspace(args.sandbox, args.input)
    case "glob":
      return await globWorkspace(args.sandbox, args.input)
    case "git":
      return await runGit(args.sandbox, args.input)
    case "apply_patch":
      return await applyWorkspacePatch(args.sandbox, args.input)
    case "bash":
      return await runBash(args.sandbox, args.input)
  }
}

async function runGit(sandbox: SandboxRuntime, input: Record<string, unknown>) {
  const args = requiredStringArray(input.args, "args")
  const cwd = sandboxWorkspacePath(optionalTrimmedString(input.cwd))

  const result = await sandbox.runCommand({
    command: gitCommand(cwd, args),
    cwd: sandboxWorkspace,
    timeoutMs: boundedTimeoutMs(input.timeoutMs),
  })

  return commandOutput(result)
}

async function runBash(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  const cwd = sandboxWorkspacePath(optionalTrimmedString(input.cwd))
  const result = await sandbox.runCommand({
    command: bashCommand(cwd, requiredTrimmedString(input.command, "command")),
    cwd: sandboxWorkspace,
    timeoutMs: boundedTimeoutMs(input.timeoutMs),
  })

  return commandOutput(result)
}

function commandOutput(result: {
  exitCode: number
  stderr: string
  stdout: string
}) {
  const stdout = boundedText(result.stdout)
  const stderr = boundedText(result.stderr)

  return {
    exitCode: result.exitCode,
    stdout: stdout.text,
    stderr: stderr.text,
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
  }
}

function gitCommand(cwd: string, args: string[]) {
  return [...workspaceGuard(cwd), readOnlyGitCommand(cwd, args)].join("\n")
}

function bashCommand(cwd: string, command: string) {
  return [
    ...workspaceGuard(cwd),
    "set -o pipefail 2>/dev/null || true",
    gitBashGuard(),
    command,
  ].join("\n")
}

function workspaceGuard(cwd: string) {
  return [
    `workspace=${shellQuote(sandboxWorkspace)}`,
    `target=${shellQuote(cwd)}`,
    'root="$(realpath "$workspace")" || exit 2',
    'current="$(realpath "$target")" || exit 2',
    'case "$current" in "$root"|"$root"/*) ;; *)',
    '  echo "cwd must be inside the Milo workspace." >&2',
    "  exit 2",
    "esac",
    'cd "$current" || exit 2',
  ]
}

function requiredStringArray(value: unknown, name: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} is required`)
  }

  return value.map((entry) => {
    if (typeof entry !== "string" || entry === "") {
      throw new Error(`${name} must contain only non-empty strings`)
    }

    return entry
  })
}
