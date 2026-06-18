import { runtimeAssets } from "../../../runtime/_generated/assets"
import { type SandboxFile } from "../tools/types"
import { codexHome } from "./harness"

export type SandboxWriteFile = {
  path: string
  data: string
}

export const sandboxWriteBatchBytes = 512 * 1024

export function createBootstrapFiles(args: {
  authJsonBase64: string
  codexConfig: string
  sandboxFiles: SandboxFile[]
}) {
  return [
    {
      path: "/tmp/milo-bootstrap.ts",
      data: runtimeAssets.sandbox.bootstrap,
    },
    {
      path: `${codexHome}/auth.json`,
      data: decodeBase64(args.authJsonBase64),
    },
    {
      path: `${codexHome}/config.toml`,
      data: args.codexConfig,
    },
    ...args.sandboxFiles.map((file) => ({
      path: file.path,
      data: file.content,
    })),
  ]
}

export function createPromptFile(prompt: string) {
  return {
    path: "/tmp/milo-prompt.md",
    data: prompt,
  }
}

export function createTraceServerFiles() {
  return [
    {
      path: "/tmp/milo-trace-server.ts",
      data: runtimeAssets.sandbox.traceServer,
    },
  ]
}

export function batchSandboxWrites(
  files: SandboxWriteFile[],
  maxBytes = sandboxWriteBatchBytes
) {
  const batches: SandboxWriteFile[][] = []
  let batch: SandboxWriteFile[] = []
  let batchBytes = 0

  for (const file of files) {
    const fileBytes = writeFileBytes(file)

    if (batch.length > 0 && batchBytes + fileBytes > maxBytes) {
      batches.push(batch)
      batch = []
      batchBytes = 0
    }

    batch.push(file)
    batchBytes += fileBytes
  }

  if (batch.length > 0) {
    batches.push(batch)
  }

  return batches
}

function writeFileBytes(file: SandboxWriteFile) {
  return Buffer.byteLength(file.path, "utf8") + Buffer.byteLength(file.data)
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf8")
}
