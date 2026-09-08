import { recordGate } from "./gate/stamp.ts"
import { packageCommand, runCommands } from "./process.ts"

await runChecks()

async function runChecks() {
  await runCommands([
    packageCommand("check:content"),
    packageCommand("check:structure"),
    packageCommand("check:dependencies"),
    packageCommand("check:versions"),
    packageCommand("check:entrypoints"),
    packageCommand("check:typecheck"),
    packageCommand("check:biome"),
    packageCommand("check:bundle"),
  ])

  recordGate("check")
}
