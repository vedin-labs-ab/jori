import { spawnSync } from "node:child_process"
import { toolCommand } from "../process.ts"

/** Read from the selected deployment, never a remembered provider CLI account.
 * Secrets stay in the child process pipe and are never included in errors. */
export function deploymentVariable(
  name: string,
  env: NodeJS.ProcessEnv = process.env
) {
  if (!env.CONVEX_DEPLOYMENT?.trim()) {
    throw new Error(
      "Choose an explicit Convex deployment before reading settings"
    )
  }
  const command = toolCommand(["convex", "env", "get", name])
  const result = spawnSync(command.command, command.args, {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.status !== 0) {
    throw new Error(`Could not read ${name} from the selected deployment`)
  }
  return result.stdout.trim() || undefined
}

export function requireDeploymentVariable(
  name: string,
  env: NodeJS.ProcessEnv = process.env
) {
  const value = deploymentVariable(name, env)
  if (value === undefined) {
    throw new Error(`Missing ${name} in the selected Convex deployment`)
  }
  return value
}
