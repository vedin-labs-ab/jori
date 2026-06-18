import path from "node:path"
import { sandboxWorkspace } from "./artifacts"

export function sandboxPath(value: string) {
  const normalized = value.trim() === "" ? "repository" : value.trim()
  const filePath = normalized.startsWith("/")
    ? path.posix.normalize(normalized)
    : path.posix.resolve(sandboxWorkspace, normalized)
  const relative = path.posix.relative(sandboxWorkspace, filePath)

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.posix.isAbsolute(relative)
  ) {
    throw new Error("Sandbox path must be inside the Milo workspace.")
  }

  return filePath
}

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}
