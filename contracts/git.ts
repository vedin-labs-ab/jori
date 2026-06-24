export function validateReadOnlyGitArgs(args: string[]) {
  if (args.length === 0) {
    throw new Error("Git arguments are required.")
  }

  const [subcommand, ...rest] = args

  if (subcommand === undefined || subcommand.startsWith("-")) {
    throw new Error("Git must be called with a read-only subcommand.")
  }

  if (hasBlockedGitFlag(rest)) {
    throw new Error("Git output-writing flags are not allowed.")
  }

  if (!isReadOnlyGitInvocation(subcommand, rest)) {
    throw new Error(
      `git ${subcommand} is not allowed. Use read-only git commands for inspection and apply_patch for writes.`
    )
  }
}

const readOnlyGitSubcommands = new Set([
  "blame",
  "cat-file",
  "describe",
  "diff",
  "for-each-ref",
  "grep",
  "log",
  "ls-files",
  "ls-tree",
  "merge-base",
  "name-rev",
  "rev-list",
  "rev-parse",
  "shortlog",
  "show",
  "show-branch",
  "show-ref",
  "status",
  "whatchanged",
])

function isReadOnlyGitInvocation(subcommand: string, rest: string[]) {
  if (readOnlyGitSubcommands.has(subcommand)) {
    return true
  }

  switch (subcommand) {
    case "branch":
      return isReadOnlyBranch(rest)
    case "config":
      return isReadOnlyConfig(rest)
    case "remote":
      return isReadOnlyRemote(rest)
    case "stash":
      return rest[0] === "list" || rest[0] === "show"
    case "tag":
      return isReadOnlyTag(rest)
    case "worktree":
      return rest[0] === "list"
    default:
      return false
  }
}

function hasBlockedGitFlag(args: string[]) {
  return args.some((arg) => arg === "--output" || arg.startsWith("--output="))
}

function isReadOnlyBranch(args: string[]) {
  const hasListMode = args.some((arg) => arg === "--list" || arg === "-l")

  return args.every((arg) => arg.startsWith("-") || hasListMode)
}

function isReadOnlyConfig(args: string[]) {
  return args.some((arg) =>
    ["--get", "--get-all", "--get-regexp", "--list", "-l"].includes(arg)
  )
}

function isReadOnlyRemote(args: string[]) {
  return (
    args.length === 0 ||
    args[0] === "-v" ||
    args[0] === "get-url" ||
    args[0] === "show"
  )
}

function isReadOnlyTag(args: string[]) {
  const hasListMode = args.length === 0 || args.includes("--list")

  return (
    hasListMode && !args.some((arg) => ["-a", "-d", "-f", "-s"].includes(arg))
  )
}
