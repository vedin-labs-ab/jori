import { packageCommand, runCommand } from "../process.ts"
import { scanSecrets } from "./secrets.ts"
import { isVerified } from "./stamp.ts"

/** Tree-based code checks may be reused; the history scan never is. The
 *  full check includes it, so an uncached gate only scans once. */
export async function verifyGate(cwd = process.cwd(), skipChecks = false) {
  if (skipChecks || isVerified(cwd)) {
    await scanSecrets(cwd)
    process.stdout.write(
      skipChecks
        ? "Code gate skipped; no verification recorded.\n"
        : "Code gate already passed on this tree.\n"
    )

    return
  }

  await runCommand({ ...packageCommand("check"), cwd })
  await runCommand({ ...packageCommand("test"), cwd })
}
