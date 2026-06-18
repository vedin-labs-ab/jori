export function createImageCheckCommand(args: {
  codexVersion: string
  imageCheck: string
  workspace: string
}) {
  return [
    "set -eu",
    `test "$(codex --version)" = "codex-cli ${args.codexVersion}"`,
    "command -v node >/dev/null",
    "command -v npm >/dev/null",
    "command -v git >/dev/null",
    `mkdir -p "${args.workspace}"`,
    writeRuntimeFileCommand(
      args.imageCheck,
      `${args.workspace}/.milo-image-check.ts`
    ),
    `node --experimental-strip-types "${args.workspace}/.milo-image-check.ts"`,
    `test -x "${args.workspace}/node_modules/.bin/tsc"`,
    `test -x "${args.workspace}/node_modules/.bin/biome"`,
    `test -x "${args.workspace}/node_modules/.bin/vite"`,
    `rm -f "${args.workspace}/.milo-image-check.ts"`,
  ].join("\n")
}

function writeRuntimeFileCommand(content: string, target: string) {
  return `printf "%s" "${encodeBase64(content)}" | base64 -d > "${target}"`
}

function encodeBase64(value: string) {
  return base64EncodeBytes(new TextEncoder().encode(value))
}

function base64EncodeBytes(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize))
  }

  return btoa(binary)
}
