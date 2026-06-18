import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "vite"
import {
  type ArtifactContract,
  normalizeArtifactContract,
} from "../../../../contracts/artifacts/contract.ts"

const contractSourcePath = "src/contract.ts"

export async function readArtifactContract(
  project: string
): Promise<ArtifactContract> {
  if (!(await hasContractSource(project))) {
    throw new Error("Artifact source is missing src/contract.ts.")
  }

  const entryPath = await writeContractEntry(project)
  const outputDirectory = path.join(project, ".milo", "contract-dist")

  await build({
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
      rollupOptions: {
        output: { entryFileNames: "contract.mjs" },
      },
      ssr: entryPath,
    },
    configFile: path.join(project, "vite.config.ts"),
    logLevel: "silent",
    root: project,
  })

  return normalizeContractModule(
    await import(`${pathToFileURL(path.join(outputDirectory, "contract.mjs"))}`)
  )
}

async function hasContractSource(project: string) {
  return (
    (
      await fs.stat(path.join(project, contractSourcePath)).catch(() => null)
    )?.isFile() === true
  )
}

async function writeContractEntry(project: string) {
  const entryPath = path.join(project, ".milo", "contract-entry.ts")

  await fs.mkdir(path.dirname(entryPath), { recursive: true })
  await fs.writeFile(
    entryPath,
    'import { contract } from "../src/contract"\nexport default contract\n',
    "utf8"
  )

  return entryPath
}

function normalizeContractModule(module: unknown): ArtifactContract {
  const contract = readDefaultExport(module)
  const json = JSON.parse(JSON.stringify(contract)) as unknown

  return normalizeArtifactContract(json)
}

function readDefaultExport(module: unknown) {
  if (typeof module === "object" && module !== null && "default" in module) {
    return module.default
  }

  throw new Error("src/contract.ts must export a named contract constant.")
}
