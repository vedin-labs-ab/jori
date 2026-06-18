import fs from "node:fs"
import path from "node:path"

const codeHome = requiredEnv("CODEX_HOME")
const workspace = process.env.MILO_WORKSPACE ?? "/home/user/milo-workspace"
const authPath = path.join(codeHome, "auth.json")
const configPath = path.join(codeHome, "config.toml")

fs.mkdirSync(codeHome, { recursive: true })
fs.mkdirSync(workspace, { recursive: true })
assertFile(authPath)
assertFile(configPath)
fs.chmodSync(authPath, 0o600)

function requiredEnv(name: string) {
  const value = process.env[name]

  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}

function assertFile(filePath: string) {
  if (!fs.statSync(filePath).isFile()) {
    throw new Error(`Missing required file: ${filePath}`)
  }
}
