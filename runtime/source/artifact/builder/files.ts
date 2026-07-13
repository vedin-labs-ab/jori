import fs from "node:fs/promises"
import path from "node:path"
import {
  type ArtifactSourceFile,
  isPlatformArtifactSourcePath,
  maxArtifactFileBytes,
  type NormalizedArtifactSourceFile,
} from "../../../../contracts/artifacts/source.ts"
import { config } from "./config.ts"

export async function copyPlatformTemplate(project: string) {
  const templateFiles = await listFiles(config.artifactTemplatePath)

  for (const filePath of templateFiles) {
    const relativePath = normalizeAssetPath(
      path.relative(config.artifactTemplatePath, filePath)
    )
    const target = path.join(project, relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(filePath, target)
  }
}

export async function writeSourceFiles(
  project: string,
  files: NormalizedArtifactSourceFile[]
) {
  for (const file of files) {
    const target = path.join(project, file.path)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, file.content, {
      encoding: "utf8",
      mode: file.executable ? 0o755 : 0o644,
    })
  }
}

export async function ensureStylesheet(
  project: string,
  files: NormalizedArtifactSourceFile[]
) {
  if (files.some((file) => file.path === "src/styles.css")) {
    return
  }

  await fs.writeFile(path.join(project, "src/styles.css"), "", "utf8")
}

export async function readSourceFiles(
  project: string,
  files: NormalizedArtifactSourceFile[]
) {
  return await Promise.all(files.map((file) => readSourceFile(project, file)))
}

export async function readWorkspaceSource(
  workspacePath: string
): Promise<ArtifactSourceFile[]> {
  const stats = await fs.stat(workspacePath).catch(() => null)

  if (stats === null || !stats.isDirectory()) {
    throw new Error(`Artifact workspace does not exist: ${workspacePath}`)
  }

  const files = (await listFiles(path.join(workspacePath, "src")))
    .map((filePath) =>
      normalizeAssetPath(path.relative(workspacePath, filePath))
    )
    .filter((filePath) => !isPlatformArtifactSourcePath(filePath))

  return await Promise.all(
    files.map(async (relativePath) => ({
      path: relativePath,
      content: await fs.readFile(
        path.join(workspacePath, relativePath),
        "utf8"
      ),
    }))
  )
}

export function toPublishSource(files: NormalizedArtifactSourceFile[]) {
  return files.map((file) => ({
    path: file.path,
    content: file.content,
    ...(file.executable ? { executable: true } : {}),
  }))
}

export async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      return entry.isDirectory() ? await listFiles(entryPath) : [entryPath]
    })
  )

  return files.flat()
}

export function normalizeAssetPath(assetPath: string) {
  return assetPath.replaceAll(path.sep, "/")
}

async function readSourceFile(
  project: string,
  file: NormalizedArtifactSourceFile
) {
  const content = await fs.readFile(path.join(project, file.path), "utf8")
  const bytes = Buffer.from(content, "utf8")

  if (bytes.byteLength === 0) {
    throw new Error(
      `Artifact source file ${file.path} is empty after formatting.`
    )
  }

  if (bytes.byteLength > maxArtifactFileBytes) {
    throw new Error(
      `Artifact source file ${file.path} exceeds ${maxArtifactFileBytes} bytes.`
    )
  }

  return {
    ...file,
    content,
    byteSize: bytes.byteLength,
  }
}
