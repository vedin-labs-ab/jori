import { requirePrimaryCheckout } from "../git.ts"
import { runInTarget } from "./run.ts"
import { taskCommand } from "./tasks.ts"

const { command, primary, target } = taskCommand(process.argv.slice(2))

if (primary) {
  requirePrimaryCheckout("Deploying shared resources")
}

runInTarget(target, command)
