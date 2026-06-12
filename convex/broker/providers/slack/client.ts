import { fetchJson } from "../common"

export type SlackApiResult = Record<string, unknown> | null

export async function slackJsonApi(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const result = await fetchJson(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body,
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

  const result = await fetchJson(url.toString(), {
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
