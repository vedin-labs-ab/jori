import { runCommand } from "../process.ts"
import { taskArguments } from "./tasks.ts"

await runCommand({
  args: taskArguments(process.argv.slice(2)),
  command: process.execPath,
  label: "Environment task",
})
