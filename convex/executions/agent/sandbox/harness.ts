export const codexHome = "/tmp/milo-codex-home"
export const codexVersion = "0.139.0"
export const e2bSandboxTemplate = "milo-codex"
export const tracePort = 8211
export const traceFile = "/tmp/milo-trace.ndjson"
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
    "set -euo pipefail",
    'printf "%s" "$MILO_CODEX_PROMPT_BASE64" | base64 -d > /tmp/milo-prompt.md',
    `codex exec --json --ephemeral --disable apps --skip-git-repo-check --sandbox read-only - < /tmp/milo-prompt.md | tee "${traceFile}"`,
  ].join("\n")
}

export function createTraceServerCommand() {
  return [
    "set -eu",
    `touch "${traceFile}"`,
    "cat > /tmp/milo-trace-server.mjs <<'NODE'",
    ...traceServerScript,
    "NODE",
    "exec node /tmp/milo-trace-server.mjs",
  ].join("\n")
}

// Token-gated SSE server that tails the trace file so browsers can follow a
// run live. Tails a file rather than the agent process, so it works for any
// harness that writes newline-delimited trace events.
const traceServerScript = [
  'import { closeSync, openSync, readSync, statSync } from "node:fs"',
  'import { createServer } from "node:http"',
  "",
  `const file = "${traceFile}"`,
  "const token = process.env.MILO_TRACE_TOKEN",
  "const pollIntervalMs = 250",
  "const keepaliveTicks = 60",
  "",
  "createServer((request, response) => {",
  '  const url = new URL(request.url, "http://sandbox")',
  "",
  '  if (url.pathname !== "/trace" || url.searchParams.get("token") !== token) {',
  "    response.writeHead(404)",
  "    response.end()",
  "    return",
  "  }",
  "",
  "  response.writeHead(200, {",
  '    "Access-Control-Allow-Origin": "*",',
  '    "Cache-Control": "no-store",',
  '    "Content-Type": "text/event-stream",',
  "  })",
  "",
  "  let offset = 0",
  '  let pending = ""',
  "  let idleTicks = 0",
  "",
  "  const forward = () => {",
  "    const size = statSync(file).size",
  "",
  "    if (size <= offset) {",
  "      idleTicks += 1",
  "",
  "      if (idleTicks >= keepaliveTicks) {",
  "        idleTicks = 0",
  '        response.write(":keepalive\\n\\n")',
  "      }",
  "",
  "      return",
  "    }",
  "",
  "    idleTicks = 0",
  "    const chunk = Buffer.alloc(size - offset)",
  '    const descriptor = openSync(file, "r")',
  "    readSync(descriptor, chunk, 0, chunk.length, offset)",
  "    closeSync(descriptor)",
  "    offset = size",
  '    pending += chunk.toString("utf8")',
  '    const lines = pending.split("\\n")',
  '    pending = lines.pop() ?? ""',
  "",
  "    for (const line of lines) {",
  '      if (line !== "") {',
  '        response.write("data: " + line + "\\n\\n")',
  "      }",
  "    }",
  "  }",
  "",
  "  forward()",
  "  const interval = setInterval(forward, pollIntervalMs)",
  '  request.on("close", () => clearInterval(interval))',
  `}).listen(${tracePort})`,
]
