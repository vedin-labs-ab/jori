import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { sandboxWorkspace } from "../contracts/coding.ts"
import { requireDeploymentVariable } from "./env/remote.ts"

const workspace = requireDeploymentVariable("BL_WORKSPACE")
const apiKey = requireDeploymentVariable("BL_API_KEY")
const directory = mkdtempSync(join(tmpdir(), "jori-sandbox-image-"))
try {
  // Only this generated build context is uploaded; no repository files or secrets.
  writeFileSync(
    join(directory, "Dockerfile"),
    `FROM node:26.8.2-bookworm-slim
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/sandbox-api
RUN apt-get update && apt-get install -y --no-install-recommends bash ca-certificates curl git python3 coreutils && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 10001 user && mkdir -p ${sandboxWorkspace} && chown -R user:user /home/user
WORKDIR ${sandboxWorkspace}
USER user
ENV BL_SANDBOX_USER_ENABLED=true
ENTRYPOINT ["/usr/local/bin/sandbox-api"]
`
  )
  writeFileSync(
    join(directory, "blaxel.toml"),
    `name = "jori-sandbox"
type = "sandbox"
[runtime]
generation = "mk3"
memory = 4096
`
  )
  execFileSync(
    "bl",
    [
      "push",
      "--type",
      "sandbox",
      "--name",
      "jori-sandbox",
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
