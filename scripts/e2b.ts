import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { defaultBuildLogger, Template } from "e2b"
import {
  sandboxArtifactRuntime,
  sandboxInternalRoot,
  sandboxWorkspace,
} from "../contracts/sandbox.ts"
import { runtimeAssets } from "../convex/runtime/_generated/assets.ts"

const cliConfigPath = join(homedir(), ".e2b", "config.json")
const e2bSandboxTemplate = process.env.MILO_E2B_TEMPLATE?.trim() || "milo-codex"
const sandboxNodeVersion = "26.3.0"

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
      `mkdir -p ${shellQuote(sandboxWorkspace)} ${shellQuote(sandboxArtifactRuntime)}`,
      "npm install -g n@10.2.0",
      `n ${sandboxNodeVersion}`,
      "hash -r",
      [
        `npm install --prefix ${shellQuote(sandboxArtifactRuntime)}`,
        "@microsoft/microsoft-graph-client@3.0.7",
        "@octokit/rest@22.0.1",
        ...runtimeAssets.artifact.dependencies,
      ].join(" "),
      `chown -R user:user ${shellQuote(sandboxWorkspace)} ${shellQuote(sandboxInternalRoot)}`,
      `chmod 755 ${shellQuote(sandboxWorkspace)}`,
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

function createImageCheckCommand() {
  return [
    "set -eu",
    "command -v node >/dev/null",
    "command -v npm >/dev/null",
    "command -v git >/dev/null",
    `mkdir -p ${shellQuote(sandboxWorkspace)}`,
    `test -x ${shellQuote(`${sandboxArtifactRuntime}/node_modules/.bin/tsc`)}`,
    `test -x ${shellQuote(`${sandboxArtifactRuntime}/node_modules/.bin/biome`)}`,
    `test -x ${shellQuote(`${sandboxArtifactRuntime}/node_modules/.bin/vite`)}`,
    `node -e ${JSON.stringify(imageCheckScript())}`,
  ].join("\n")
}

function imageCheckScript() {
  return [
    "await import('react')",
    "await import('vite')",
    "await import('zod')",
    "await import('lucide-react')",
    "await import('@tailwindcss/vite')",
    "await import('tailwindcss')",
    "await import('shadcn')",
  ].join(";")
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}
