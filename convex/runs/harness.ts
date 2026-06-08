export const codexHome = "/tmp/milo-codex-home"
export const workspace = "/tmp/milo-workspace"

export function createInstallCommand() {
  return [
    "set -eu",
    "if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then",
    "  apt-get update",
    "  apt-get install -y ca-certificates curl gnupg",
    "  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
    "  apt-get install -y nodejs",
    "fi",
    "if ! command -v git >/dev/null 2>&1; then",
    "  apt-get update",
    "  apt-get install -y git",
    "fi",
    `mkdir -p "${workspace}"`,
    "npm install -g @openai/codex@latest slack-mcp-server@1.3.0",
    `npm install --prefix "${workspace}" @modelcontextprotocol/sdk@1.29.0`,
    `chmod 777 "${workspace}"`,
    "rm -rf /var/lib/apt/lists/*",
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
    "codex exec --json --ephemeral --skip-git-repo-check --sandbox read-only - < /tmp/milo-prompt.md",
  ].join("\n")
}
