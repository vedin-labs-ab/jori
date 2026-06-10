export const codexHome = "/tmp/milo-codex-home"
export const codexVersion = "0.139.0"
export const e2bSandboxTemplate = "milo-codex"
export const workspace = "/home/user/milo-workspace"

export function createImageCheckCommand() {
  return [
    "set -eu",
    `test "$(codex --version)" = "codex-cli ${codexVersion}"`,
    "command -v node >/dev/null",
    "command -v npm >/dev/null",
    "command -v git >/dev/null",
    `mkdir -p "${workspace}"`,
    `cat > "${workspace}/.milo-image-check.mjs" <<'NODE'`,
    'import { Server } from "@modelcontextprotocol/sdk/server/index.js";',
    'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";',
    "void [Server, StdioServerTransport];",
    "NODE",
    `node "${workspace}/.milo-image-check.mjs"`,
    `rm -f "${workspace}/.milo-image-check.mjs"`,
  ].join("\n")
}

export function createBootstrapCommand() {
  return [
    "set -eu",
    `mkdir -p "${codexHome}" "${workspace}"`,
    'printf "%s" "$CODEX_AUTH_JSON_BASE64" | base64 -d > "$CODEX_HOME/auth.json"',
    'printf "%s" "$CODEX_CONFIG_TOML" > "$CODEX_HOME/config.toml"',
    'printf "%s" "$MILO_SANDBOX_FILES_BASE64" | base64 -d > /tmp/milo-sandbox-files.json',
    "node <<'NODE'",
    "const fs = require('fs');",
    "const path = require('path');",
    "const files = JSON.parse(fs.readFileSync('/tmp/milo-sandbox-files.json', 'utf8'));",
    "for (const file of files) {",
    "  fs.mkdirSync(path.dirname(file.path), { recursive: true });",
    "  fs.writeFileSync(file.path, file.content);",
    "}",
    "NODE",
    'chmod 600 "$CODEX_HOME/auth.json"',
  ].join("\n")
}

export function createCodexCommand() {
  return [
    "set -eu",
    'printf "%s" "$MILO_CODEX_PROMPT_BASE64" | base64 -d > /tmp/milo-prompt.md',
    "codex exec --json --ephemeral --disable apps --skip-git-repo-check --sandbox danger-full-access - < /tmp/milo-prompt.md",
  ].join("\n")
}
