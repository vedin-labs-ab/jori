import { defaultBuildLogger, Template } from "e2b"
import { sandboxWorkspace } from "../contracts/coding.ts"
import { sandboxEndpoint } from "../convex/runtime/sandbox/e2b/connection.ts"
import { deploymentVariable, requireDeploymentVariable } from "./env/remote.ts"

const e2bSandboxTemplate = requireDeploymentVariable("JORI_E2B_TEMPLATE")
const sandboxNodeVersion = "26.3.0"
const apiKey = requireDeploymentVariable("E2B_API_KEY")
const endpoint = sandboxEndpoint(deploymentVariable("E2B_DOMAIN"))

const template = Template()
  .fromBaseImage()
  .setEnvs({ DEBIAN_FRONTEND: "noninteractive" })
  .aptInstall(["ca-certificates", "curl", "git"], {
    noInstallRecommends: true,
  })
  .runCmd(
    [
      `mkdir -p ${shellQuote(sandboxWorkspace)}`,
      "npm install -g n@10.2.0",
      `n ${sandboxNodeVersion}`,
      "hash -r",
      `chown -R user:user ${shellQuote(sandboxWorkspace)}`,
      `chmod 755 ${shellQuote(sandboxWorkspace)}`,
      "npm cache clean --force",
      "rm -rf /var/lib/apt/lists/*",
      createImageCheckCommand(),
    ],
    { user: "root" }
  )

await Template.build(template, e2bSandboxTemplate, {
  apiKey,
  ...endpoint,
  onBuildLogs: defaultBuildLogger(),
})

function createImageCheckCommand() {
  return [
    "set -eu",
    "command -v node >/dev/null",
    "command -v npm >/dev/null",
    "command -v git >/dev/null",
    `mkdir -p ${shellQuote(sandboxWorkspace)}`,
  ].join("\n")
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}
