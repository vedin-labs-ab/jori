import { readFile } from "node:fs/promises"

// Packages that coordinate through module-level state — React contexts,
// Radix dismissable-layer stacks — break silently when the lockfile resolves
// more than one version: each copy keeps its own state, so a dropdown
// dismissal falls through to the dialog beneath it. Keep them singletons;
// `pnpm dedupe` collapses violations.
const singletonPackages = ["react", "react-dom", "radix-ui"]
const singletonScopes = ["@radix-ui/", "@base-ui/"]

const lockfile = await readFile("pnpm-lock.yaml", "utf8")
const versions = collectPackageVersions(lockfile)
const violations = [...versions.entries()]
  .filter(([name, found]) => isSingleton(name) && found.size > 1)
  .map(([name, found]) => `  ${name}: ${[...found].sort().join(", ")}`)

if (violations.length > 0) {
  process.stderr.write(
    [
      "Singleton package check failed.",
      "",
      "These packages hold module-level state and must resolve to exactly",
      "one version; run `pnpm dedupe` and commit the lockfile:",
      ...violations,
      "",
    ].join("\n")
  )
  process.exitCode = 1
} else {
  process.stdout.write(
    `Singleton package check passed (${versions.size} packages scanned).\n`
  )
}

function collectPackageVersions(content: string) {
  const versionsByName = new Map<string, Set<string>>()
  // pnpm 12 writes separate YAML documents for the package manager and app.
  const packageSections = content.matchAll(
    /^packages:$([\s\S]*?)(?=^\S|(?![\s\S]))/gm
  )
  const entryPattern = /^ {2}'?((?:@[^/']+\/)?[^@' ]+)@([^'(:\n]+)/gm

  for (const section of packageSections) {
    for (const match of section[1].matchAll(entryPattern)) {
      const [, name, version] = match
      const found = versionsByName.get(name) ?? new Set<string>()

      found.add(version)
      versionsByName.set(name, found)
    }
  }

  return versionsByName
}

function isSingleton(name: string) {
  return (
    singletonPackages.includes(name) ||
    singletonScopes.some((scope) => name.startsWith(scope))
  )
}
