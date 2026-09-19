import { acquireLock } from "./gate/lock.ts"
import { scanSecrets } from "./gate/secrets.ts"
import { recordGate } from "./gate/stamp.ts"
import { treeHash } from "./git.ts"
import { packageCommand, runCommands } from "./process.ts"

/** The check gate, under the machine-wide lock like the test gate: its
 *  heavy members are each multi-threaded, and a check overlapping another
 *  worktree's suite is what pushed the machine into swap. */
const tree = treeHash()
const release = await acquireLock()

try {
  await scanSecrets()

  // The cheap checks first, so a structural mistake fails within a second,
  // then the heavy four two at a time: Biome alone bounds the gate, and
  // launching all eight at once took longer than one at a time, at twice
  // the memory, because Biome, tsc and Vite already use every core.
  await runCommands(
    [
      packageCommand("check:content"),
      packageCommand("check:structure"),
      packageCommand("check:versions"),
      packageCommand("check:entrypoints"),
      packageCommand("check:biome"),
      packageCommand("check:typecheck"),
      packageCommand("check:dependencies"),
      packageCommand("check:bundle"),
    ],
    2
  )
} finally {
  release()
}

recordGate("check", tree)
