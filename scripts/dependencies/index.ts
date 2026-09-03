import { cruise } from "dependency-cruiser"
import { ruleSet } from "./rules.ts"

const roots = ["src", "convex", "contracts", "prompts", "scripts", "skills"]
const excludedPaths = [
  "(^|/)[.]agents(/|$)",
  "(^|/)[.]claude(/|$)",
  "(^|/)[.]tanstack(/|$)",
  // The repository's own build output only: packages ship their code
  // under dist too, and excluding those would hide the edges into them
  // that the console-view rules are about.
  "^dist(/|$)",
  "[.]test[.](?:ts|tsx|js|jsx)$",
].join("|")

// Recorded as the modules app code imports, but not cruised themselves:
// packages, and the vendored better-auth-ui registry code, kept as
// installed, whose internal wiring (plugin <-> settings views) is
// upstream's to govern.
const unfollowedPaths = [
  "(^|/)node_modules(/|$)",
  "^src/components/auth(/|$)",
].join("|")

const result = await cruise(roots, {
  doNotFollow: { path: unfollowedPaths },
  exclude: excludedPaths,
  outputType: "err-long",
  // Package paths read as node_modules/<package>/…, the way they are
  // imported, rather than as pnpm's store paths.
  preserveSymlinks: true,
  ruleSet,
  tsPreCompilationDeps: "specify",
  tsConfig: {
    fileName: "tsconfig.json",
  },
  validate: true,
})

if (result.exitCode === 0) {
  process.stdout.write("Dependency boundary check passed.\n")
} else {
  process.stderr.write(formatOutput(result.output))
  process.exitCode = result.exitCode
}

function formatOutput(output: unknown) {
  return typeof output === "string"
    ? output
    : `${JSON.stringify(output, null, 2)}\n`
}
