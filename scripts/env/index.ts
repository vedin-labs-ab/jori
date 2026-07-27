import { spawnSync } from "node:child_process"
import { loadEnvironment } from "./load.ts"
import { environments, isEnvironment } from "./names.ts"

const usage = `Usage: scripts/env/index.ts --env <${environments.join("|")}> -- <command>`

const { environment, command } = parseArguments(process.argv.slice(2))
const { env } = loadEnvironment(environment)
const result = spawnSync(command[0], command.slice(1), {
  env,
  stdio: "inherit",
})

if (result.error !== undefined) {
  throw result.error
}

process.exit(result.status ?? 1)

function parseArguments(argv: readonly string[]) {
  const separator = argv.indexOf("--")

  if (argv[0] !== "--env" || separator !== 2) {
    throw new Error(usage)
  }

  const environment = argv[1]
  const command = argv.slice(separator + 1)

  if (!isEnvironment(environment)) {
    throw new Error(usage)
  }

  if (command.length === 0) {
    throw new Error(usage)
  }

  return { command, environment }
}
