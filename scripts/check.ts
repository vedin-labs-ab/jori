import {
  type Command,
  packageCommand,
  runCommand,
  runCommands,
  runTasks,
} from "./process.ts"

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"

const mode = process.argv[2]

if (mode === undefined) {
  await runChecks()
} else if (mode === "biome") {
  await runBiomeChecks()
} else {
  throw new Error(`Unknown check mode: ${mode}`)
}

async function runChecks() {
  await runCommands([
    packageCommand("runtime:check"),
    packageCommand("templates:check"),
    packageCommand("content:compile"),
  ])

  await runTasks([
    runCommands([
      packageCommand("check:structure"),
      packageCommand("check:dependencies"),
      packageCommand("check:versions"),
      packageCommand("check:entrypoints"),
      packageCommand("check:drift"),
      packageCommand("check:typecheck"),
    ]),
    runBiomeChecks(),
  ])
}

async function runBiomeChecks() {
  await runCommand(biomeCommand("biome", ["ci", "--error-on-warnings", "."]))
}

function biomeCommand(label: string, args: string[]): Command {
  return {
    args: ["exec", "biome", ...args],
    command: pnpm,
    label,
  }
}
