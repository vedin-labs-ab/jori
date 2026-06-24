import { validateReadOnlyGitArgs } from "../../contracts/git"
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

export function gitCredentialHelperScript(tokenPath: string, username: string) {
  const operation = shellParameter(1, "get")

  return [
    "#!/bin/sh",
    `token=${shellQuote(tokenPath)}`,
    `case "${operation}" in`,
    "  get)",
    `    printf "username=%s\\n" ${shellQuote(username)}`,
    '    printf "password=%s\\n" "$(cat "$token")"',
    "    ;;",
    "  *) ;;",
    "esac",
    "",
  ].join("\n")
}

export function gitCloneCommand(args: {
  directory: string
  helperPath: string
  ref?: string
  remoteUrl: string
  tokenPath: string
}) {
  return [
    "set -eu",
    `directory=${shellQuote(args.directory)}`,
    `helper=${shellQuote(args.helperPath)}`,
    `remote=${shellQuote(args.remoteUrl)}`,
    `token=${shellQuote(args.tokenPath)}`,
    `ref=${shellQuote(args.ref ?? "")}`,
    'cleanup() { rm -f "$helper" "$token"; }',
    "trap cleanup EXIT",
    'if [ -d "$directory" ] && [ -n "$(ls -A "$directory")" ]; then',
    '  echo "Clone directory is not empty" >&2',
    "  exit 1",
    "fi",
    'mkdir -p "$(dirname "$directory")"',
    'chmod 700 "$helper"',
    'chmod 600 "$token"',
    'git_auth() { GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c credential.helper="!$helper" "$@"; }',
    'git_auth clone --depth 50 "$remote" "$directory"',
    'cd "$directory"',
    'git remote set-url origin "$remote"',
    "git config --local --unset-all credential.helper >/dev/null 2>&1 || true",
    'if [ -n "$ref" ]; then',
    '  if git_auth ls-remote --exit-code --heads origin "$ref" >/dev/null 2>&1; then',
    '    git_auth fetch --depth 50 origin "$ref:refs/remotes/origin/$ref"',
    '    git checkout -B "$ref" "origin/$ref"',
    '  elif git_auth ls-remote --exit-code --tags origin "$ref" >/dev/null 2>&1; then',
    '    git_auth fetch --depth 50 origin "refs/tags/$ref:refs/tags/$ref"',
    '    git checkout --detach "refs/tags/$ref"',
    "  else",
    '    git_auth fetch --depth 50 origin "$ref"',
    "    git checkout --detach FETCH_HEAD",
    "  fi",
    "fi",
  ].join("\n")
}

export function readOnlyGitCommand(cwd: string, args: string[]) {
  validateReadOnlyGitArgs(args)

  return [
    `cd ${shellQuote(cwd)} || exit 2`,
    `GIT_OPTIONAL_LOCKS=0 git ${args.map(shellQuote).join(" ")}`,
  ].join("\n")
}

export function gitBashGuard() {
  const subcommand = shellParameter(1)

  return [
    'milo_real_git="$(command -v git)" || exit 2',
    'milo_git_guard="$(mktemp -d)" || exit 2',
    'cleanup_git_guard() { rm -rf "$milo_git_guard"; }',
    "trap cleanup_git_guard EXIT",
    "cat > \"$milo_git_guard/git\" <<'MILO_READ_ONLY_GIT'",
    "#!/bin/sh",
    `case "${subcommand}" in`,
    ...readOnlyGitShellCases("    "),
    "  *)",
    '    echo "git is read-only in bash; use the git tool for inspection and apply_patch for writes." >&2',
    "    exit 2",
    "    ;;",
    "esac",
    'case " $* " in',
    '  *" --output "*|*" --output="*)',
    '    echo "git --output is not allowed in read-only mode." >&2',
    "    exit 2",
    "    ;;",
    "esac",
    'GIT_OPTIONAL_LOCKS=0 exec "$MILO_REAL_GIT" "$@"',
    "MILO_READ_ONLY_GIT",
    'chmod 700 "$milo_git_guard/git"',
    'export MILO_REAL_GIT="$milo_real_git"',
    'PATH="$milo_git_guard:$PATH"',
    "export PATH",
  ].join("\n")
}

function readOnlyGitShellCases(indent: string) {
  const subcommand = shellParameter(2)

  return [
    `${indent}blame|cat-file|describe|diff|for-each-ref|grep|log|ls-files|ls-tree|merge-base|name-rev|rev-list|rev-parse|shortlog|show|show-branch|show-ref|status|whatchanged) ;;`,
    `${indent}branch)`,
    `${indent}  case " $* " in *" -c "*|*" -C "*|*" -d "*|*" -D "*|*" -m "*|*" -M "*|*" -u "*|*" --copy "*|*" --delete "*|*" --edit-description "*|*" --move "*|*" --set-upstream-to "*|*" --set-upstream-to="*|*" --unset-upstream "*) exit 2 ;; esac`,
    `${indent}  case "$#" in 1) ;; 2) case "${subcommand}" in --show-current) ;; *) exit 2 ;; esac ;; *) case " $* " in *" --list "*|*" -l "*) ;; *) exit 2 ;; esac ;; esac`,
    `${indent}  ;;`,
    `${indent}config)`,
    `${indent}  case " $* " in *" --get "*|*" --get-all "*|*" --get-color "*|*" --get-colorbool "*|*" --get-regexp "*|*" --get-urlmatch "*|*" --list "*|*" -l "*) ;; *) exit 2 ;; esac`,
    `${indent}  case " $* " in *" --add "*|*" --file "*|*" --file="*|*" --global "*|*" --replace-all "*|*" --system "*|*" --unset "*|*" --unset-all "*|*" --rename-section "*|*" --remove-section "*) exit 2 ;; esac`,
    `${indent}  ;;`,
    `${indent}remote)`,
    `${indent}  case "${subcommand}" in ""|-v|get-url|show) ;; *) exit 2 ;; esac`,
    `${indent}  ;;`,
    `${indent}stash)`,
    `${indent}  case "${subcommand}" in list|show) ;; *) exit 2 ;; esac`,
    `${indent}  ;;`,
    `${indent}tag)`,
    `${indent}  case " $* " in *" -a "*|*" -d "*|*" -F "*|*" -f "*|*" -m "*|*" -s "*|*" -u "*|*" --annotate "*|*" --cleanup "*|*" --cleanup="*|*" --create-reflog "*|*" --delete "*|*" --edit "*|*" --file "*|*" --file="*|*" --force "*|*" --local-user "*|*" --local-user="*|*" --message "*|*" --message="*|*" --sign "*) exit 2 ;; esac`,
    `${indent}  case "$#" in 1) ;; *) case " $* " in *" --list "*|*" -l "*) ;; *) exit 2 ;; esac ;; esac`,
    `${indent}  ;;`,
    `${indent}worktree)`,
    `${indent}  case "${subcommand}" in list) ;; *) exit 2 ;; esac`,
    `${indent}  ;;`,
  ]
}

function shellParameter(index: number, fallback = "") {
  return `$${`{${index}:-${fallback}}`}`
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
