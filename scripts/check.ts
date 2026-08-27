import { packageCommand, runCommand, runCommands, runTasks } from "./process.ts"

await runChecks()

async function runChecks() {
  await runCommands([packageCommand("content:compile")])

  await runTasks([
    runCommands([
      packageCommand("check:structure"),
      packageCommand("check:dependencies"),
      packageCommand("check:versions"),
      packageCommand("check:entrypoints"),
      packageCommand("check:typecheck"),
    ]),
    runCommand(packageCommand("check:biome")),
  ])
}
