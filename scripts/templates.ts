import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { playbookCatalog } from "../contracts/playbooks/catalog.ts"
import { runtimeAssets } from "../runtime/artifacts/_generated/assets.ts"
import { root } from "./runtime/paths.ts"

const generatedPath = path.join(
  root,
  "convex/artifacts/templates/_generated/templates.ts"
)
const summaryPath = path.join(root, "contracts/playbooks/generated.ts")
const versionsPath = path.join(root, "playbooks/versions.json")

async function compileArtifactTemplates(checkMode: boolean) {
  const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "milo-templates-"))

  try {
    const template = path.join(runtime, "template")
    await writeFiles(template, runtimeAssets.artifact.template)
    const configPath = path.join(runtime, "builder.json")
    await fs.writeFile(
      configPath,
      JSON.stringify({ artifactTemplatePath: template }),
      "utf8"
    )
    process.env.MILO_WORKSPACE = root
    process.env.MILO_ARTIFACT_BUILDER_CONFIG = configPath

    const { buildArtifact } = await import(
      "../runtime/artifacts/builder/index.ts"
    )
    const briefing = await buildArtifact([
      {
        path: "src/App.tsx",
        content: await readSource("briefing/app.txt"),
      },
      {
        path: "src/Briefing.tsx",
        content: await readSource("briefing/briefing.txt"),
      },
      {
        path: "src/contract.ts",
        content: await readSource("briefing/contract.txt"),
      },
      {
        path: "src/revision.ts",
        content: `export const artifactRuntimeRevision = "${runtimeRevision()}"\n`,
      },
    ])
    const templates = { "meeting-briefing": briefing }
    const content = format(generatedPath, renderGenerated(templates))
    const summary = format(summaryPath, renderSummary(templates))
    const versions = await renderRecipeVersions()

    if (checkMode) {
      await requireCurrent(generatedPath, content)
      await requireCurrent(summaryPath, summary)
      await requireCurrent(versionsPath, versions)

      return
    }

    await fs.mkdir(path.dirname(generatedPath), { recursive: true })
    await fs.writeFile(generatedPath, content, "utf8")
    await fs.writeFile(summaryPath, summary, "utf8")
    await fs.writeFile(versionsPath, versions, "utf8")
  } finally {
    await fs.rm(runtime, { force: true, recursive: true })
  }
}

async function requireCurrent(filePath: string, content: string) {
  const existing = await fs.readFile(filePath, "utf8").catch(() => "")

  if (existing !== content) {
    throw new Error(
      "Artifact templates are stale. Run `pnpm templates:compile` and commit the result."
    )
  }
}

// Enabled automations pin a playbook version and only see edits through a
// bump, so recipe content changing under an unchanged version would update
// invisibly. The committed lock catches exactly that in both modes.
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
          "Bump the playbook's version in contracts/playbooks, then run `pnpm templates:compile`."
      )
    }

    entries.push([definition.key, { version: definition.version, fingerprint }])
  }

  entries.sort(([left], [right]) => left.localeCompare(right))

  return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`
}

/** Hash of the recipe's versioned source files: the instruction template
 *  plus the artifact template directory when the playbook has one. Both
 *  share the template's short name: playbooks/briefing.md pairs with
 *  playbooks/templates/briefing/. */
async function recipeFingerprint(definition: {
  template: string
  artifact?: unknown
}) {
  const hash = createHash("sha256")

  hash.update(await readRecipeFile(`prompts/${definition.template}.md`))

  if (definition.artifact !== undefined) {
    const directory = path.join(
      root,
      "playbooks/templates",
      path.basename(definition.template)
    )

    for (const name of (await fs.readdir(directory)).sort()) {
      hash.update(`\n${name}\n`)
      hash.update(await fs.readFile(path.join(directory, name), "utf8"))
    }
  }

  return hash.digest("hex")
}

async function readRecipeFile(relativePath: string) {
  return await fs.readFile(path.join(root, relativePath), "utf8")
}

function runtimeRevision() {
  return createHash("sha256")
    .update(JSON.stringify(runtimeAssets.artifact.template))
    .digest("hex")
}

async function readSource(relativePath: string) {
  return await fs.readFile(
    path.join(root, "playbooks/templates", relativePath),
    "utf8"
  )
}

async function writeFiles(directory: string, files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const destination = path.join(directory, relativePath)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, content, "utf8")
  }
}

function renderGenerated(value: unknown) {
  return [
    "/* biome-ignore-all lint/suspicious/noTemplateCurlyInString: generated artifact source */\n",
    "// Generated by scripts/templates.ts. Do not edit by hand.\n",
    "export const playbookTemplates = ",
    JSON.stringify(value, null, 2),
    " as const\n",
  ].join("")
}

type CompiledTemplates = Record<
  string,
  { contract: { state: ContractStateEntry[] } }
>

type ContractStateEntry = {
  name: string
  scope: string
  description?: string
  schemaName: string
  schemaVersion: number
  schema: unknown
}

/** The client-side contract summary: what each template's state holds —
 *  including the enforced JSON Schema — so the console can describe a
 *  not-yet-provisioned artifact without the server-only template payload. */
function renderSummary(templates: CompiledTemplates) {
  const summaries = Object.fromEntries(
    Object.entries(templates).map(([key, template]) => [
      key,
      template.contract.state.map((entry) => ({
        name: entry.name,
        scope: entry.scope,
        description: entry.description,
        schemaName: entry.schemaName,
        schemaVersion: entry.schemaVersion,
        schema: entry.schema,
      })),
    ])
  )

  return [
    "/* biome-ignore-all lint/style/noExcessiveLinesPerFile: generated contract data */\n",
    "// Generated by scripts/templates.ts. Do not edit by hand.\n",
    "export const playbookTemplateContracts = ",
    JSON.stringify(summaries, null, 2),
    " as const\n",
  ].join("")
}

function format(filePath: string, content: string) {
  const result = spawnSync(
    path.join(root, "node_modules/.bin/biome"),
    ["format", "--stdin-file-path", filePath],
    { encoding: "utf8", input: content }
  )

  if (result.status !== 0) {
    throw new Error(result.stderr || "Could not format artifact templates.")
  }

  return result.stdout
}

await compileArtifactTemplates(process.argv.includes("--check"))
