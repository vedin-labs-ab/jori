import { spawnSync } from "node:child_process"
import { isRegion } from "../../contracts/region.ts"
import { loadEnvironment } from "./load.ts"
import { environments, isEnvironment } from "./names.ts"
import { loadTarget } from "./target.ts"

const usage = `Usage: scripts/env/index.ts --env <${environments.join("|")}> [--region eu|us] -- <command>`

const { environment, region, command } = parseArguments(process.argv.slice(2))
const env =
  region === undefined
    ? loadEnvironment(environment).env
    : loadTarget(environment, region)
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

  if (argv[0] !== "--env" || (separator !== 2 && separator !== 4)) {
    throw new Error(usage)
  }

  const environment = argv[1]
  const region = separator === 4 ? argv[3] : undefined
  const command = argv.slice(separator + 1)

  if (!isEnvironment(environment)) {
    throw new Error(usage)
  }

  if (
    (separator === 4 && (argv[2] !== "--region" || !isRegion(region))) ||
    (environment === "prod" && region === undefined)
  ) {
    throw new Error(usage)
  }

  if (command.length === 0) {
    throw new Error(usage)
  }

  return { command, environment, region: isRegion(region) ? region : undefined }
}
