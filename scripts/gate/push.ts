import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { git, isClean } from "../git.ts"
import { packageCommand, runCommand } from "../process.ts"

/** Verify the code actually being pushed, not an unrelated working tree. */
export async function verifyPush(input: string, cwd = process.cwd()) {
  const updates = input.trim().split("\n").filter(Boolean)
  const revisions = updates.flatMap((line) => {
    const [, revision] = line.split(/\s+/)
    if (revision === undefined) {
      throw new Error("Invalid pre-push update.")
    }
    return /^0+$/.test(revision) ? [] : [revision]
  })
  if (revisions.length === 0) {
    return
  }

  const head = git(["rev-parse", "HEAD"], cwd)
  if (
    revisions.some(
      (revision) => git(["rev-parse", `${revision}^{commit}`], cwd) !== head
    )
  ) {
    throw new Error(
      "Push the checked-out commit only. Check out each other branch before pushing it so its code is verified."
    )
  }
  if (!isClean(cwd)) {
    throw new Error(
      "Commit or stash changes before pushing so the gate checks the exact committed tree."
    )
  }

  await runCommand({ ...packageCommand("verify"), cwd })
  if (!isClean(cwd) || git(["rev-parse", "HEAD"], cwd) !== head) {
    throw new Error(
      "The checkout changed during verification. Verify and push again."
    )
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await verifyPush(readFileSync(0, "utf8"))
}
