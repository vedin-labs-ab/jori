import {
  type CodingToolName,
  isCodingToolName,
  sandboxWorkspace,
} from "../../../contracts/coding"
import { isRecord } from "../../../contracts/json"
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
import {
  type SandboxCommandHandle,
  type SandboxCommandResult,
  type SandboxRuntime,
} from "./types"

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

/** What bash answers with when its command outlived the grace window: the
 *  tool layer parks the run on the handle and collects it on the wake. */
export type ParkedCommand = { parked: SandboxCommandHandle }

export function isParkedCommand(value: unknown): value is ParkedCommand {
  return (
    isRecord(value) &&
    isRecord(value.parked) &&
    typeof value.parked.pid === "number"
  )
}

/** How long the run waits on a parked command. The tool layer parks to the
 *  same bound the command was started with, so it reads it from here. */
export function bashTimeoutMs(input: unknown) {
  return boundedTimeoutMs(normalizeToolInput(input).timeoutMs)
}

export async function finishBash(
  sandbox: SandboxRuntime,
  handle: SandboxCommandHandle,
  options: { kill: boolean }
) {
  return commandOutput(await sandbox.finishCommand(handle, options))
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

/** A shell command can outlast a turn, so bash starts it and takes whichever
 *  the sandbox has: the finished output, or a handle the run parks on until
 *  the command calls back. */
async function runBash(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  const cwd = sandboxWorkspacePath(optionalTrimmedString(input.cwd))
  const outcome = await sandbox.startCommand({
    command: bashCommand(cwd, requiredTrimmedString(input.command, "command")),
    cwd: sandboxWorkspace,
    timeoutMs: bashTimeoutMs(input),
  })

  return "pid" in outcome ? { parked: outcome } : commandOutput(outcome)
}

function commandOutput(result: SandboxCommandResult) {
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
  return [...workspaceGuard(cwd), readOnlyGitCommand(args)].join("\n")
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
    '  echo "cwd must be inside the Jori workspace." >&2',
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
