import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  appSourceHashInput,
  type NormalizedAppSourceFile,
  normalizeAppSourceFiles,
  rejectForbiddenSourceAccess,
} from "../../../contracts/apps/source.ts"
import { readBuildAssets } from "./assets.ts"
import { formatAppSource, runAppChecks } from "./command.ts"
import { config, nodeModulesPath } from "./config.ts"
import { readAppContract } from "./contract.ts"
import {
  copyPlatformTemplate,
  ensureStylesheet,
  readSourceFiles,
  readWorkspaceSource,
  toPublishSource,
  writeSourceFiles,
} from "./files.ts"
export async function buildApp(source: unknown) {
  const files = normalizeAppSourceFiles(source)
  const sourcePaths = files.map((file) => file.path)
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "milo-app-"))

  try {
    await copyPlatformTemplate(project)
    await writeSourceFiles(project, files)
    await ensureStylesheet(project, files)
    await fs.symlink(nodeModulesPath, path.join(project, "node_modules"), "dir")
    await formatAppSource(project, sourcePaths)
    const formattedFiles = await readSourceFiles(project, files)
    rejectForbiddenSourceAccess(formattedFiles)
    await runAppChecks(project, sourcePaths)

    return {
      source: toPublishSource(formattedFiles),
      contract: await readAppContract(project),
      build: {
        sourceHash: hashAppSource(formattedFiles),
        assets: await readBuildAssets(project),
      },
    }
  } finally {
    await fs.rm(project, { force: true, recursive: true })
  }
}

export async function checkAppWorkspace(workspacePath: string) {
  const source = await readWorkspaceSource(workspacePath)

  return await buildApp(source)
}

function hashAppSource(files: NormalizedAppSourceFile[]) {
  return createHash("sha256").update(appSourceHashInput(files)).digest("hex")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2]
  const target = process.argv[3]

  if (command === "check" && target !== undefined) {
    await checkAppWorkspace(path.resolve(target))
    process.stdout.write("App checks passed.\n")
  } else if (command === "template") {
    process.stdout.write(`${config.appTemplatePath}\n`)
  } else {
    process.stderr.write(
      "Usage: node --experimental-strip-types milo-app-builder.ts check <app-workspace>\n" +
        "       node --experimental-strip-types milo-app-builder.ts template\n"
    )
    process.exitCode = 1
  }
}
