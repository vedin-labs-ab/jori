export type SlackApiResult = Record<string, unknown> | null

export async function slackJsonApi(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const result = await fetchSlackApi(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  })

  return assertSlackApiSucceeded(result)
}

export async function slackFormApi(
  token: string,
  method: string,
  body: Record<string, boolean | number | string | undefined>
) {
  const form = new URLSearchParams()

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      form.set(key, String(value))
    }
  }

  const result = await fetchSlackApi(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  })

  return assertSlackApiSucceeded(result)
}

export async function slackQueryApi(
  token: string,
  method: string,
  params: Record<string, unknown>
) {
  const url = new URL(`https://slack.com/api/${method}`)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  const result = await fetchSlackApi(url.toString(), {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  })

  return assertSlackApiSucceeded(result)
}

export function requiredSlackResultString(result: SlackApiResult, key: string) {
  const value = result?.[key]

  if (typeof value !== "string" || value === "") {
    throw new Error(`Slack API response missing ${key}`)
  }

  return value
}

async function fetchSlackApi(url: string, options: RequestInit) {
  const response = await fetch(url, options)
  const text = await response.text()
  const result = text === "" ? null : JSON.parse(text)

  if (!response.ok) {
    throw new Error(`Slack API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

function assertSlackApiSucceeded(result: unknown): SlackApiResult {
  if (!isSlackApiResult(result)) {
    throw new Error("Slack API request failed: invalid response")
  }

  if (result !== null && result.ok === false) {
    throw new Error(`Slack API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

function isSlackApiResult(result: unknown): result is SlackApiResult {
  return (
    result === null || (typeof result === "object" && !Array.isArray(result))
  )
}
