type SlackPreflightConfig = {
  botScopes: string[]
  userScopes: string[]
}

const config = readJsonEnv<SlackPreflightConfig>(
  "MILO_SLACK_PREFLIGHT_CONFIG_BASE64"
)

await verifyToken("bot", process.env.MILO_SLACK_BOT_TOKEN, config.botScopes)
await verifyToken("user", process.env.MILO_SLACK_USER_TOKEN, config.userScopes)
process.stdout.write("Slack token preflight passed\n")

async function verifyToken(
  label: string,
  token: string | undefined,
  requiredScopes: string[]
) {
  if (token === undefined || token === "") {
    throw new Error(`Missing Slack ${label} token`)
  }

  const response = await fetch("https://slack.com/api/auth.test", {
    headers: { authorization: `Bearer ${token}` },
  })
  const body = await response.json()

  if (!response.ok || body.ok !== true) {
    throw new Error(
      `Slack ${label} token auth.test failed: ${JSON.stringify(body)}`
    )
  }

  const scopes = new Set(
    (response.headers.get("x-oauth-scopes") ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean)
  )
  const missingScopes = requiredScopes.filter((scope) => !scopes.has(scope))

  if (missingScopes.length > 0) {
    throw new Error(
      `Slack ${label} token is missing scopes: ${missingScopes.join(", ")}`
    )
  }
}

function readJsonEnv<T>(name: string): T {
  const value = process.env[name]

  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as T
}

export {}
