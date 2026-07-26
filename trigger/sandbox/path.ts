import path from "node:path"
import { sandboxWorkspace } from "../../contracts/runtime/sandbox"

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
  const relative = path.posix.relative(sandboxWorkspace, filePath)

  if (relative === "" && options.allowRoot === true) {
    return filePath
  }

  if (isEscapingSandbox(relative)) {
    throw new Error("Sandbox path must be inside the Jori workspace.")
  }

  return filePath
}

function resolveSandboxPath(value: string) {
  const normalized = value.trim() === "" ? "." : value.trim()

  return normalized.startsWith("/")
    ? path.posix.normalize(normalized)
    : path.posix.resolve(sandboxWorkspace, normalized)
}

function isEscapingSandbox(relative: string) {
  return (
    relative === "" ||
    relative.startsWith("..") ||
    path.posix.isAbsolute(relative)
  )
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
