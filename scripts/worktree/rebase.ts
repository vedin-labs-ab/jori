import { git } from "../git.ts"

/** Flatten merged task history for main's linear-history rule, then report
 * whether the resulting lockfile needs installing before the gate. */
export function rebaseTask(
  branch: string,
  directory: string,
  checkout = process.cwd()
) {
  const includesMain =
    git(["merge-base", "main", branch], checkout) ===
    git(["rev-parse", "main"], checkout)
  const hasMerges =
    git(
      ["rev-list", "--merges", "--max-count=1", `main..${branch}`],
      checkout
    ) !== ""
  if (includesMain && !hasMerges) {
    return false
  }

  const lockfile = git(["rev-parse", "HEAD:pnpm-lock.yaml"], directory)
  try {
    // Force replay when the task already includes main; Git can otherwise
    // retain the existing graph. Explicitly override rebase.rebaseMerges.
    git(
      [
        "rebase",
        "--no-rebase-merges",
        ...(hasMerges ? ["--force-rebase"] : []),
        "main",
      ],
      directory
    )
  } catch (error) {
    git(["rebase", "--abort"], directory)
    throw new Error(
      `${branch} does not rebase cleanly on main. Rebase it in ${directory}, resolve the conflicts, and land again.`,
      { cause: error }
    )
  }
  return git(["rev-parse", "HEAD:pnpm-lock.yaml"], directory) !== lockfile
}
