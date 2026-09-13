import { spawn } from "node:child_process"

export type Command = {
  args: string[]
  command: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  label: string
}

export async function runCommand({ args, command, cwd, env, label }: Command) {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" })

    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} terminated with ${signal}.`))
        return
      }

      resolve(code ?? 1)
    })
  })

  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}.`)
  }
}

/** Runs the commands in order, `concurrency` at a time. Once one fails, the
 *  ones still queued are not started; the ones running finish and report. */
export async function runCommands(
  commands: Command[],
  concurrency = commands.length
) {
  const queue = [...commands]
  const failures: unknown[] = []
  const lanes = Array.from(
    { length: Math.min(concurrency, commands.length) },
    async () => {
      for (
        let command = queue.shift();
        command !== undefined && failures.length === 0;
        command = queue.shift()
      ) {
        try {
          await runCommand(command)
        } catch (error) {
          failures.push(error)
        }
      }
    }
  )

  await Promise.all(lanes)

  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} command(s) failed.`)
  }
}

export function packageCommand(...args: string[]): Command {
  return {
    args,
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    label: args.join(" "),
  }
}

/** A frozen, offline-first install in `cwd`: the store already holds what
 *  main needs, so it is seconds, and CI keeps pnpm from prompting. */
export function installCommand(cwd: string): Command {
  return {
    ...packageCommand("install", "--prefer-offline", "--frozen-lockfile"),
    cwd,
    env: { ...process.env, CI: "true" },
  }
}

export function toolCommand(args: string[]): Command {
  return {
    args,
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    label: args.join(" "),
  }
}
