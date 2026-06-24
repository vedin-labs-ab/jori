import { sandboxWorkspace } from "./artifacts"
import { compactFailure } from "./output"
import { shellQuote } from "./path"
import { type SandboxRuntime } from "./types"

export async function runJsonScript(args: {
  input: Record<string, unknown>
  sandbox: SandboxRuntime
  script: string
  timeoutMs?: number
}) {
  const result = await args.sandbox.runCommand({
    command: scriptCommand(args.script, args.input),
    cwd: sandboxWorkspace,
    timeoutMs: args.timeoutMs,
  })

  if (result.exitCode !== 0) {
    throw new Error(compactFailure(result))
  }

  return parseResult(result.stdout)
}

export function temporaryGitCredentialPath(label: string) {
  return `/tmp/milo-github-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function gitAskpassScript(tokenPath: string, username: string) {
  return [
    "#!/bin/sh",
    'case "$1" in',
    `  *Username*) printf "%s\\n" ${shellQuote(username)} ;;`,
    `  *Password*) cat ${shellQuote(tokenPath)} ;;`,
    '  *) printf "\\n" ;;',
    "esac",
    "",
  ].join("\n")
}

export function gitCloneCommand(args: {
  askpassPath: string
  directory: string
  ref?: string
  remoteUrl: string
  tokenPath: string
}) {
  return [
    "set -eu",
    `askpass=${shellQuote(args.askpassPath)}`,
    `directory=${shellQuote(args.directory)}`,
    `remote=${shellQuote(args.remoteUrl)}`,
    `token=${shellQuote(args.tokenPath)}`,
    `ref=${shellQuote(args.ref ?? "")}`,
    'cleanup() { rm -f "$askpass" "$token"; }',
    "trap cleanup EXIT",
    'if [ -d "$directory" ] && [ -n "$(ls -A "$directory")" ]; then',
    '  echo "Clone directory is not empty" >&2',
    "  exit 1",
    "fi",
    'mkdir -p "$(dirname "$directory")"',
    'chmod 700 "$askpass"',
    'chmod 600 "$token"',
    'GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$askpass" git clone --depth 50 "$remote" "$directory"',
    'cd "$directory"',
    'git remote set-url origin "$remote"',
    'if [ -n "$ref" ]; then',
    '  if git ls-remote --exit-code --heads origin "$ref" >/dev/null 2>&1; then',
    '    git fetch --depth 50 origin "$ref:refs/remotes/origin/$ref"',
    '    git checkout -B "$ref" "origin/$ref"',
    '  elif git ls-remote --exit-code --tags origin "$ref" >/dev/null 2>&1; then',
    '    git fetch --depth 50 origin "refs/tags/$ref:refs/tags/$ref"',
    '    git checkout --detach "refs/tags/$ref"',
    "  else",
    '    git fetch --depth 50 origin "$ref"',
    "    git checkout --detach FETCH_HEAD",
    "  fi",
    "fi",
  ].join("\n")
}

function scriptCommand(script: string, input: Record<string, unknown>) {
  return [
    `export MILO_TOOL_INPUT=${shellQuote(JSON.stringify(input))}`,
    "node --input-type=module <<'MILO_TOOL_SCRIPT'",
    script,
    "MILO_TOOL_SCRIPT",
  ].join("\n")
}

function parseResult(stdout: string) {
  const trimmed = stdout.trim()

  if (trimmed === "") {
    throw new Error("Sandbox tool returned no result.")
  }

  return JSON.parse(trimmed) as unknown
}
