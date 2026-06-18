import { runtimeAssets } from "../../../../runtime/_generated/assets"
import { base64Encode } from "../../../../shared/encoding"

export type TokenPreflightSpec = {
  /** Environment variable the sandbox exposes the access token through. */
  tokenEnv: string
  missingTokenError: string
  /** Request URL, or a builder evaluated when the command is created. */
  url: string | (() => string)
  /** Headers sent in addition to the bearer authorization header. */
  headers?: Record<string, string>
  /** JSON payload; when present the request is sent as a POST. */
  body?: unknown
  /** Response body properties that fail the preflight when truthy. */
  failureBodyProperties?: string[]
  failureLabel: string
  successMessage: string
}

export function createTokenPreflightCommand(spec: TokenPreflightSpec) {
  return createNodeScriptCommand({
    configEnv: "MILO_PREFLIGHT_CONFIG_BASE64",
    config: normalizeTokenPreflightSpec(spec),
    script: runtimeAssets.sandbox.tokenPreflight,
    target: "/tmp/milo-token-preflight.ts",
  })
}

export function createNodeScriptCommand(args: {
  config: unknown
  configEnv: string
  script: string
  target: string
}) {
  return [
    "set -eu",
    `export ${args.configEnv}="${encodeBase64Json(args.config)}"`,
    `printf "%s" "${encodeBase64(args.script)}" | base64 -d > "${args.target}"`,
    `node --experimental-strip-types "${args.target}"`,
  ].join("\n")
}

function normalizeTokenPreflightSpec(spec: TokenPreflightSpec) {
  return {
    ...spec,
    url: typeof spec.url === "function" ? spec.url() : spec.url,
  }
}

function encodeBase64Json(value: unknown) {
  return encodeBase64(JSON.stringify(value))
}

function encodeBase64(value: string) {
  return base64Encode(value)
}
