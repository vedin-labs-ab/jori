import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { git } from "../git.ts"
import { runCommand } from "../process.ts"

const version = "8.30.1"

/** History and refs can change without changing the tree the code gate
 *  verified. Scan them afresh, using the same pinned binary as CI. */
export async function scanSecrets(cwd = process.cwd()) {
  const command = process.env.GITLEAKS_BIN ?? "gitleaks"
  const installed = spawnSync(command, ["version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (installed.status !== 0 || installed.stdout.trim() !== version) {
    throw new Error(
      `Install Gitleaks ${version} on PATH or set GITLEAKS_BIN to that binary.`
    )
  }

  if (git(["rev-parse", "--is-shallow-repository"], cwd) === "true") {
    throw new Error(
      "Secret scanning requires full Git history. Fetch it with git fetch --unshallow first."
    )
  }

  await runCommand({
    command,
    args: [
      "git",
      "--log-opts=--all --full-history",
      "--redact",
      "--no-banner",
      "--ignore-gitleaks-allow",
    ],
    cwd,
    label: "Git history secret scan",
  })
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await scanSecrets()
}
