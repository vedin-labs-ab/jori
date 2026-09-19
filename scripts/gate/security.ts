import { packageCommand, runCommand } from "../process.ts"
import { requireRuntime } from "./runtime.ts"
import { scanSecrets } from "./secrets.ts"

/** History and published advisories can change independently of a tree. */
export async function checkSecurity(cwd = process.cwd()) {
  requireRuntime()
  await scanSecrets(cwd)
  await runCommand({
    ...packageCommand("audit", "--audit-level=moderate"),
    cwd,
  })
}
