import { sandboxWorkspace } from "../../../contracts/coding"

export function sandboxWorkspacePath(value: string | undefined) {
  return value === undefined || value.trim() === ""
    ? sandboxWorkspace
    : sandboxPath(value, { allowRoot: true })
}

export function sandboxClonePath(args: {
  repository: string
  value: string | null | undefined
}) {
  if (
    args.value === undefined ||
    args.value === null ||
    args.value.trim() === ""
  ) {
    return sandboxPath(repositoryDirectory(args.repository))
  }

  return sandboxPath(args.value)
}

function sandboxPath(value: string, options: { allowRoot?: boolean } = {}) {
  const filePath = resolveSandboxPath(value)
  const relative = relativePosix(sandboxWorkspace, filePath)

  if (relative === "" && options.allowRoot === true) {
    return filePath
  }

  if (relative === "" || relative.startsWith("..")) {
    throw new Error("Sandbox path must be inside the Jori workspace.")
  }

  return filePath
}

function resolveSandboxPath(value: string) {
  const normalized = value.trim() === "" ? "." : value.trim()

  return isAbsolutePosix(normalized)
    ? normalizePosix(normalized)
    : joinPosix(sandboxWorkspace, normalized)
}

function repositoryDirectory(repository: string) {
  const name = repository.split("/").filter(Boolean).at(-1) ?? "repository"
  const clean = name
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80)

  return clean === "" ? "repository" : clean
}

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/** The sandbox filesystem is always posix, and these modules run in the Convex
 *  V8 runtime where node:path does not exist, so the few path operations the
 *  tools need are plain string work. */
export function isAbsolutePosix(value: string) {
  return value.startsWith("/")
}

export function normalizePosix(value: string) {
  const absolute = isAbsolutePosix(value)
  const segments: string[] = []

  for (const segment of value.split("/")) {
    if (segment === "" || segment === ".") {
      continue
    }

    if (segment !== "..") {
      segments.push(segment)
    } else if (segments.length > 0 && segments.at(-1) !== "..") {
      segments.pop()
    } else if (!absolute) {
      segments.push("..")
    }
  }

  const joined = segments.join("/")

  if (absolute) {
    return `/${joined}`
  }

  return joined === "" ? "." : joined
}

export function joinPosix(...parts: string[]) {
  return normalizePosix(parts.filter((part) => part !== "").join("/"))
}

export function relativePosix(from: string, to: string) {
  const fromSegments = pathSegments(from)
  const toSegments = pathSegments(to)
  let shared = 0

  while (
    shared < fromSegments.length &&
    shared < toSegments.length &&
    fromSegments[shared] === toSegments[shared]
  ) {
    shared += 1
  }

  return [
    ...fromSegments.slice(shared).map(() => ".."),
    ...toSegments.slice(shared),
  ].join("/")
}

function pathSegments(value: string) {
  return normalizePosix(value)
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
}
