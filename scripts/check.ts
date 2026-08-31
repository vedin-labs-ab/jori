import { packageCommand, runCommand, runCommands } from "./process.ts"

await runChecks()

async function runChecks() {
  await runCommand(packageCommand("content:compile"))

  await runCommands([
    packageCommand("check:structure"),
    packageCommand("check:dependencies"),
    packageCommand("check:versions"),
    packageCommand("check:entrypoints"),
    packageCommand("check:typecheck"),
    packageCommand("check:biome"),
  ])
}
