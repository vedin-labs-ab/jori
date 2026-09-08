import { isTarget, targets } from "./names.ts"
import { runInTarget } from "./run.ts"

const usage = `Usage: scripts/env/index.ts <${targets.join("|")}> -- <command>`

const [target, separator, ...command] = process.argv.slice(2)

if (!isTarget(target) || separator !== "--" || command.length === 0) {
  throw new Error(usage)
}

runInTarget(target, command)
