import { isTarget, type Target, targets } from "./names.ts"

/** The named tasks a package script binds to a target. Each is a fixed
 *  command; whatever follows the target is handed to it unchanged. */
const commands = {
  onboarding: ["npx", "convex", "run", "organization/onboarding:reset"],
  sandbox: ["node", "--experimental-strip-types", "scripts/blaxel.ts"],
  seed: ["node", "--experimental-strip-types", "scripts/db/seed.ts"],
  skills: ["npx", "convex", "run", "skills/catalog:syncGlobalSkills"],
  truncate: ["node", "--experimental-strip-types", "scripts/db/truncate.ts"],
} as const

type Task = keyof typeof commands

/** Tasks that rewrite a deployment's data, so they only ever run on dev. */
const databaseTasks: ReadonlySet<Task> = new Set([
  "onboarding",
  "seed",
  "truncate",
])

const usage = `Usage: scripts/env/task.ts <${Object.keys(commands).join("|")}> <${targets.join("|")}> [arguments…]`

export function taskCommand(argv: readonly string[]): {
  command: string[]
  primary: boolean
  target: Target
} {
  const [task, target, ...rest] = argv

  if (!isTask(task) || !isTarget(target)) {
    throw new Error(usage)
  }

  if (databaseTasks.has(task) && target !== "dev") {
    throw new Error(`Database ${task} only runs against the dev target.`)
  }

  if (task === "sandbox" && rest.length > 0) {
    throw new Error(`Usage: pnpm sandbox <${targets.join("|")}>`)
  }

  return {
    command: [...commands[task], ...rest],
    primary: task === "skills" || task === "sandbox",
    target,
  }
}

function isTask(value: string | undefined): value is Task {
  return value !== undefined && Object.hasOwn(commands, value)
}
