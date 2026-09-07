import { isRegion } from "../../contracts/region.ts"
import { isEnvironment } from "./names.ts"

const commands = {
  sandbox: ["node", "--experimental-strip-types", "scripts/e2b.ts"],
  skills: ["npx", "convex", "run", "skills/catalog:syncGlobalSkills"],
} as const

const usage =
  "Usage: scripts/env/task.ts <sandbox|skills> --env dev|prod [--region eu|us]"

/** Named package tasks accept appended target flags, then put them before the
 * generic environment wrapper's command separator. Child arguments are fixed,
 * so a caller's --region can never be mistaken for a provider CLI option. */
export function taskArguments(argv: readonly string[]) {
  const [task, environmentOption, environment, regionOption, region] = argv

  if (
    !isTask(task) ||
    environmentOption !== "--env" ||
    !isEnvironment(environment) ||
    (argv.length !== 3 && argv.length !== 5)
  ) {
    throw new Error(usage)
  }

  if (
    (environment === "dev" && argv.length !== 3) ||
    (environment === "prod" &&
      (regionOption !== "--region" || !isRegion(region)))
  ) {
    throw new Error(usage)
  }

  return [
    "--experimental-strip-types",
    "scripts/env/index.ts",
    "--env",
    environment,
    ...(environment === "prod" ? ["--region", region] : []),
    "--",
    ...commands[task],
  ]
}

function isTask(value: string): value is keyof typeof commands {
  return Object.hasOwn(commands, value)
}
