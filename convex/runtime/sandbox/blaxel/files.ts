"use node"

import { shellQuote } from "../path"
import { type BlaxelSandbox, runSandboxCommand } from "../support"

/** lstat exposes symlinks; the provider's directory listing does not. */
export async function sandboxFileInfo(sandbox: BlaxelSandbox, path: string) {
  const script = `const fs = require("node:fs"); const s = fs.lstatSync(process.argv[1]); console.log(JSON.stringify({size:s.size,type:s.isFile()?"file":s.isDirectory()?"dir":"other",...(s.isSymbolicLink()?{symlinkTarget:fs.readlinkSync(process.argv[1])}:{})}));`
  const result = await runSandboxCommand(sandbox, {
    command: `node -e ${shellQuote(script)} ${shellQuote(path)}`,
    timeoutMs: 30_000,
  })
  if (result.exitCode !== 0) {
    throw new Error("Sandbox file was not found or cannot be inspected.")
  }
  return JSON.parse(result.stdout) as {
    size: number
    type: string
    symlinkTarget?: string
  }
}
