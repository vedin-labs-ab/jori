import { spawn } from "node:child_process"

export type Command = {
  args: string[]
  command: string
  label: string
}

export async function runCommand({ args, command, label }: Command) {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" })

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

export async function runCommands(commands: Command[]) {
  await runTasks(commands.map(runCommand))
}

export async function runTasks(tasks: Promise<unknown>[]) {
  const results = await Promise.allSettled(tasks)
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  )

  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} command(s) failed.`)
  }
}

export function packageCommand(script: string): Command {
  return {
    args: [script],
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    label: script,
  }
}
