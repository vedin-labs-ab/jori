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

const readOnlyGitSubcommands = flagSet(
  "blame cat-file describe diff for-each-ref grep log ls-files ls-tree merge-base name-rev rev-list rev-parse shortlog show show-branch show-ref status whatchanged"
)

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
  if (args.length === 0) {
    return true
  }

  if (args.length === 1 && args[0] === "--show-current") {
    return true
  }

  if (args.some(isBranchWriteFlag)) {
    return false
  }

  const hasListMode = args.some(isBranchListFlag)

  return args.every(
    (arg) => isReadOnlyBranchFlag(arg) || (hasListMode && !arg.startsWith("-"))
  )
}

function isReadOnlyConfig(args: string[]) {
  return (
    args.some(isConfigReadMode) &&
    args.every((arg) => !arg.startsWith("-") || isReadOnlyConfigFlag(arg))
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
  if (args.length === 0) {
    return true
  }

  if (args.some(isTagWriteFlag)) {
    return false
  }

  const hasListMode = args.some((arg) => arg === "--list" || arg === "-l")

  return args.every(
    (arg) => isReadOnlyTagFlag(arg) || (hasListMode && !arg.startsWith("-"))
  )
}

const branchWriteFlags = flagSet(
  "-c -C -d -D -m -M -u --copy --delete --edit-description --move --set-upstream-to --unset-upstream"
)
const branchReadFlags = flagSet(
  "-a -l -r -v -vv --all --color --column --contains --format --list --merged --no-abbrev --no-color --no-column --no-contains --no-merged --points-at --remotes --show-current --sort --verbose"
)

function isBranchListFlag(arg: string) {
  return arg === "--list" || arg === "-l"
}

function isBranchWriteFlag(arg: string) {
  return branchWriteFlags.has(arg) || startsWithAny(arg, branchWritePrefixes)
}

const branchWritePrefixes = ["--set-upstream-to="]

function isReadOnlyBranchFlag(arg: string) {
  return branchReadFlags.has(arg) || startsWithAny(arg, branchReadPrefixes)
}

const branchReadPrefixes = [
  "--abbrev=",
  "--color=",
  "--column=",
  "--contains=",
  "--format=",
  "--merged=",
  "--no-contains=",
  "--no-merged=",
  "--points-at=",
  "--sort=",
]

const configReadModes = flagSet(
  "-l --get --get-all --get-color --get-colorbool --get-regexp --get-urlmatch --list"
)
const configReadFlags = flagSet(
  "-z --blob --default --fixed-value --includes --local --name-only --null --show-origin --show-scope --type --worktree"
)

function isConfigReadMode(arg: string) {
  return configReadModes.has(arg)
}

function isReadOnlyConfigFlag(arg: string) {
  return (
    configReadModes.has(arg) ||
    configReadFlags.has(arg) ||
    startsWithAny(arg, configReadPrefixes)
  )
}

const configReadPrefixes = ["--blob=", "--default=", "--type="]

const tagWriteFlags = flagSet(
  "-a -d -F -f -m -s -u --annotate --cleanup --create-reflog --delete --edit --file --force --local-user --message --sign"
)
const tagReadFlags = flagSet(
  "-l -n --column --contains --format --ignore-case --list --merged --no-column --no-contains --no-merged --points-at --sort"
)

function isTagWriteFlag(arg: string) {
  return tagWriteFlags.has(arg) || startsWithAny(arg, tagWritePrefixes)
}

const tagWritePrefixes = [
  "--cleanup=",
  "--file=",
  "--local-user=",
  "--message=",
]

function isReadOnlyTagFlag(arg: string) {
  return (
    tagReadFlags.has(arg) ||
    /^-n[0-9]+$/.test(arg) ||
    startsWithAny(arg, tagReadPrefixes)
  )
}

const tagReadPrefixes = [
  "--column=",
  "--contains=",
  "--format=",
  "--merged=",
  "--no-contains=",
  "--no-merged=",
  "--points-at=",
  "--sort=",
]

function startsWithAny(value: string, prefixes: string[]) {
  return prefixes.some((prefix) => value.startsWith(prefix))
}

function flagSet(flags: string) {
  return new Set(flags.split(" "))
}
