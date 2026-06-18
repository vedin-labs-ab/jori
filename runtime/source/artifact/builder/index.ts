import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readBuildAssets } from "./assets.ts"
import { formatArtifactSource, runArtifactChecks } from "./command.ts"
import { config, nodeModulesPath } from "./config.ts"
import { readArtifactContract } from "./contract.ts"
import {
  copyPlatformTemplate,
  ensureStylesheet,
  readSourceFiles,
  readWorkspaceSource,
  toPublishSource,
  writeSourceFiles,
} from "./files.ts"
import {
  hashArtifactSource,
  normalizeArtifactSource,
  rejectForbiddenSourceAccess,
} from "./source.ts"
import { type ArtifactSourceFile } from "./types.ts"

export async function buildArtifact(source: unknown) {
  const files = normalizeArtifactSource(source)
  const sourcePaths = files.map((file) => file.path)
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "milo-artifact-"))

  try {
    await copyPlatformTemplate(project)
    await writeSourceFiles(project, files)
    await ensureStylesheet(project, files)
    await fs.symlink(nodeModulesPath, path.join(project, "node_modules"), "dir")
    await formatArtifactSource(project, sourcePaths)
    const formattedFiles = await readSourceFiles(project, files)
    rejectForbiddenSourceAccess(formattedFiles)
    await runArtifactChecks(project, sourcePaths)

    return {
      source: toPublishSource(formattedFiles),
      contract: await readArtifactContract(project),
      build: {
        sourceHash: hashArtifactSource(formattedFiles),
        assets: await readBuildAssets(project),
      },
    }
  } finally {
    await fs.rm(project, { force: true, recursive: true })
  }
}

export async function checkArtifactWorkspace(workspacePath: string) {
  const source = await readWorkspaceSource(workspacePath)

  return await buildArtifact(source)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2]
  const target = process.argv[3]

  if (command === "check" && target !== undefined) {
    await checkArtifactWorkspace(path.resolve(target))
    process.stdout.write("Artifact checks passed.\n")
  } else if (command === "template") {
    process.stdout.write(`${config.artifactTemplatePath}\n`)
  } else {
    process.stderr.write(
      "Usage: node --experimental-strip-types milo-artifact-builder.ts check <artifact-workspace>\n" +
        "       node --experimental-strip-types milo-artifact-builder.ts template\n"
    )
    process.exitCode = 1
  }
}

export type { ArtifactSourceFile }
