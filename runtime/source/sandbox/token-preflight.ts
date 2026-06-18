type TokenPreflightConfig = {
  tokenEnv: string
  missingTokenError: string
  url: string
  headers?: Record<string, string>
  body?: unknown
  failureBodyProperties?: string[]
  failureLabel: string
  successMessage: string
}

const config = readJsonEnv<TokenPreflightConfig>("MILO_PREFLIGHT_CONFIG_BASE64")
const token = process.env[config.tokenEnv]

if (token === undefined || token === "") {
  throw new Error(config.missingTokenError)
}

const response = await fetch(config.url, {
  method: config.body === undefined ? "GET" : "POST",
  headers: {
    authorization: `Bearer ${token}`,
    ...config.headers,
  },
  body: config.body === undefined ? undefined : JSON.stringify(config.body),
})
const body = await response.json()

if (
  !response.ok ||
  hasFailureBodyProperty(body, config.failureBodyProperties)
) {
  throw new Error(
    `${config.failureLabel} preflight failed: ${JSON.stringify(body)}`
  )
}

process.stdout.write(`${config.successMessage}\n`)

function hasFailureBodyProperty(body: unknown, properties?: string[]) {
  return (properties ?? []).some(
    (property) => isRecord(body) && Boolean(body[property])
  )
}

function readJsonEnv<T>(name: string): T {
  const value = process.env[name]

  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export {}
