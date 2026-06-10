import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { defaultBuildLogger, Template } from "e2b"
import {
  codexVersion,
  createImageCheckCommand,
  e2bSandboxTemplate,
  workspace,
} from "../convex/executions/sandbox/harness.ts"

const cliConfigPath = join(homedir(), ".e2b", "config.json")

const apiKey = process.env.E2B_API_KEY ?? readCliApiKey()

if (apiKey === undefined) {
  throw new Error("Missing E2B_API_KEY. Run e2b auth login or set E2B_API_KEY.")
}

const template = Template()
  .fromBaseImage()
  .setEnvs({ DEBIAN_FRONTEND: "noninteractive" })
  .aptInstall(["ca-certificates", "curl", "git"], {
    noInstallRecommends: true,
  })
  .runCmd(
    [
      `mkdir -p ${workspace}`,
      `npm install -g @openai/codex@${codexVersion} slack-mcp-server@1.3.0`,
      [
        `npm install --prefix ${workspace}`,
        "@microsoft/microsoft-graph-client@3.0.7",
        "@modelcontextprotocol/sdk@1.29.0",
        "@octokit/rest@22.0.1",
      ].join(" "),
      `chmod 777 ${workspace}`,
      "npm cache clean --force",
      "rm -rf /var/lib/apt/lists/*",
      createImageCheckCommand(),
    ],
    { user: "root" }
  )

await Template.build(template, e2bSandboxTemplate, {
  apiKey,
  onBuildLogs: defaultBuildLogger(),
})

function readCliApiKey() {
  if (!existsSync(cliConfigPath)) {
    return undefined
  }

  const config = JSON.parse(readFileSync(cliConfigPath, "utf8")) as {
    teamApiKey?: string
  }

  return config.teamApiKey
}
