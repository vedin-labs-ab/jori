import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { dockerfile } from "./image.ts"

// Explicit credentials only. This script never discovers or targets a default deployment.
const name = process.argv[2]
const workspace = process.env.BL_WORKSPACE
const apiKey = process.env.BL_API_KEY
if (
  !name ||
  !/^jori-discovery-preview-[a-z0-9-]+$/.test(name) ||
  !workspace ||
  !apiKey
) {
  throw new Error(
    "Provide a jori-discovery-preview- image name and explicit BL_WORKSPACE/BL_API_KEY."
  )
}
const directory = mkdtempSync(join(tmpdir(), "jori-discovery-image-"))
try {
  writeFileSync(join(directory, "Dockerfile"), dockerfile)
  writeFileSync(
    join(directory, "blaxel.toml"),
    `name = "${name}"\ntype = "sandbox"\n[runtime]\ngeneration = "mk3"\nmemory = 4096\n`
  )
  execFileSync(
    "bl",
    [
      "push",
      "--type",
      "sandbox",
      "--name",
      name,
      "--directory",
      directory,
      "--workspace",
      workspace,
      "--yes",
    ],
    {
      cwd: directory,
      stdio: "inherit",
      env: {
        ...process.env,
        BL_API_KEY: apiKey,
        BL_WORKSPACE: workspace,
        DO_NOT_TRACK: "1",
      },
    }
  )
} finally {
  rmSync(directory, { recursive: true, force: true })
}
