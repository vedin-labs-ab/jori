import path from "node:path"
import { fileURLToPath } from "node:url"
import { git } from "../git.ts"

/** Shared by every worktree; a relative hooks path follows each checkout. */
export function installHooks(cwd = process.cwd()) {
  const current = git(
    ["config", "--get", "--default", "", "core.hooksPath"],
    cwd
  )
  if (current !== "" && current !== ".githooks") {
    throw new Error(
      `Git hooks already use ${current}. Integrate Jori's pre-push hook there before changing core.hooksPath.`
    )
  }
  git(["config", "--local", "core.hooksPath", ".githooks"], cwd)
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  installHooks()
}
