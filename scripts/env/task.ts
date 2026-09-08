import { runInTarget } from "./run.ts"
import { taskCommand } from "./tasks.ts"

const { command, target } = taskCommand(process.argv.slice(2))

runInTarget(target, command)
