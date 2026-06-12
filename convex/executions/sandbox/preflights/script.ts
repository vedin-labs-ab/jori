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
  /** Extra JavaScript failure condition evaluated against the response body. */
  failureCondition?: string
  failureLabel: string
  successMessage: string
}

export function createTokenPreflightCommand(spec: TokenPreflightSpec) {
  const url = typeof spec.url === "function" ? spec.url() : spec.url
  const headers = Object.entries(spec.headers ?? {})
  const failure = [
    "!response.ok",
    ...(spec.failureCondition === undefined ? [] : [spec.failureCondition]),
  ].join(" || ")

  return [
    "node <<'NODE'",
    "async function main() {",
    `  const token = process.env.${spec.tokenEnv};`,
    "  if (!token) {",
    `    throw new Error(${JSON.stringify(spec.missingTokenError)});`,
    "  }",
    `  const response = await fetch(${JSON.stringify(url)}, {`,
    ...(spec.body === undefined ? [] : ["    method: 'POST',"]),
    "    headers: {",
    "      authorization: 'Bearer ' + token,",
    ...headers.map(
      ([name, value]) =>
        `      ${JSON.stringify(name)}: ${JSON.stringify(value)},`
    ),
    "    },",
    ...(spec.body === undefined
      ? []
      : [`    body: ${JSON.stringify(JSON.stringify(spec.body))},`]),
    "  });",
    "  const body = await response.json();",
    `  if (${failure}) {`,
    `    throw new Error(${JSON.stringify(spec.failureLabel)} + ' preflight failed: ' + JSON.stringify(body));`,
    "  }",
    `  console.log(${JSON.stringify(spec.successMessage)});`,
    "}",
    "main().catch((error) => {",
    "  console.error(error);",
    "  process.exit(1);",
    "});",
    "NODE",
  ].join("\n")
}
