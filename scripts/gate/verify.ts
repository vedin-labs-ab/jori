import path from "node:path"
import { fileURLToPath } from "node:url"
import { packageCommand, runCommand } from "../process.ts"
import { checkSecurity } from "./security.ts"
import { isVerified } from "./stamp.ts"

/** Tree-based code checks may be reused; history and advisory checks never are. The
 *  full check includes security checks, so an uncached gate runs them once. */
export async function verifyGate(cwd = process.cwd(), skipChecks = false) {
  if (skipChecks || isVerified(cwd)) {
    await checkSecurity(cwd)
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

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await verifyGate()
}
