import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { defaultBuildLogger, Template } from "e2b"
import {
  sandboxAppRuntime,
  sandboxInternalRoot,
  sandboxWorkspace,
} from "../contracts/runtime/sandbox.ts"
import { runtimeAssets } from "../runtime/apps/_generated/assets.ts"

const cliConfigPath = join(homedir(), ".e2b", "config.json")
const e2bSandboxTemplate = requireTemplateName()
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
      `mkdir -p ${shellQuote(sandboxWorkspace)} ${shellQuote(sandboxAppRuntime)}`,
      "npm install -g n@10.2.0",
      `n ${sandboxNodeVersion}`,
      "hash -r",
      [
        `npm install --prefix ${shellQuote(sandboxAppRuntime)}`,
        ...runtimeAssets.app.dependencies,
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

/** Template names are global to the E2B team, so each environment must name
 *  its own. There is no default: one would let a development build overwrite
 *  the template production sandboxes start from. */
function requireTemplateName() {
  const template = process.env.JORI_E2B_TEMPLATE?.trim()

  if (template === undefined || template === "") {
    throw new Error("Missing JORI_E2B_TEMPLATE")
  }

  return template
}

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
    `test -x ${shellQuote(`${sandboxAppRuntime}/node_modules/.bin/tsc`)}`,
    `test -x ${shellQuote(`${sandboxAppRuntime}/node_modules/.bin/biome`)}`,
    `test -x ${shellQuote(`${sandboxAppRuntime}/node_modules/.bin/vite`)}`,
    `test -x ${shellQuote(`${sandboxAppRuntime}/node_modules/.bin/shadcn`)}`,
    `cd ${shellQuote(sandboxAppRuntime)}`,
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
  ].join(";")
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}
