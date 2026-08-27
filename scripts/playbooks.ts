import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { playbookCatalog } from "../contracts/playbooks/catalog.ts"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const versionsPath = path.join(root, "playbooks/versions.json")

// Enabled automations pin a playbook version and only see edits through a
// bump, so recipe content changing under an unchanged version would update
// invisibly. The committed lock catches exactly that in both modes.
async function lockRecipeVersions(checkMode: boolean) {
  const versions = await renderRecipeVersions()

  if (checkMode) {
    const existing = await fs.readFile(versionsPath, "utf8").catch(() => "")

    if (existing !== versions) {
      throw new Error(
        "Playbook versions are stale. Run `pnpm playbooks:lock` and commit the result."
      )
    }

    return
  }

  await fs.writeFile(versionsPath, versions, "utf8")
}

async function renderRecipeVersions() {
  const lock = JSON.parse(
    await fs.readFile(versionsPath, "utf8").catch(() => "{}")
  ) as Record<string, { version: number; fingerprint: string }>
  const entries: [string, { version: number; fingerprint: string }][] = []

  for (const definition of playbookCatalog) {
    const fingerprint = await recipeFingerprint(definition)
    const locked = lock[definition.key]

    if (
      locked !== undefined &&
      locked.version === definition.version &&
      locked.fingerprint !== fingerprint
    ) {
      throw new Error(
        `The "${definition.key}" recipe changed under version ${definition.version}. ` +
          "Bump the playbook's version in contracts/playbooks, then run `pnpm playbooks:lock`."
      )
    }

    entries.push([definition.key, { version: definition.version, fingerprint }])
  }

  entries.sort(([left], [right]) => left.localeCompare(right))

  return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`
}

/** Hash of the recipe's versioned source: the instruction template. */
async function recipeFingerprint(definition: { template: string }) {
  const hash = createHash("sha256")

  hash.update(await fs.readFile(`${root}/prompts/${definition.template}.md`))

  return hash.digest("hex")
}

await lockRecipeVersions(process.argv.includes("--check"))
