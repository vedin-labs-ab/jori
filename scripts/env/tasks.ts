import { isTarget, type Target, targets } from "./names.ts"

/** The named tasks a package script binds to a target. Each is a fixed
 *  command; whatever follows the target is handed to it unchanged. */
const commands = {
  sandbox: ["node", "--experimental-strip-types", "scripts/e2b.ts"],
  seed: ["node", "--experimental-strip-types", "scripts/db/seed.ts"],
  skills: ["npx", "convex", "run", "skills/catalog:syncGlobalSkills"],
  truncate: ["node", "--experimental-strip-types", "scripts/db/truncate.ts"],
} as const

type Task = keyof typeof commands

const usage = `Usage: scripts/env/task.ts <${Object.keys(commands).join("|")}> <${targets.join("|")}> [arguments…]`

export function taskCommand(argv: readonly string[]): {
  command: string[]
  target: Target
} {
  const [task, target, ...rest] = argv

  if (!isTask(task) || !isTarget(target)) {
    throw new Error(usage)
  }

  return { command: [...commands[task], ...rest], target }
}

function isTask(value: string | undefined): value is Task {
  return value !== undefined && Object.hasOwn(commands, value)
}
