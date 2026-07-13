import { linearGraphqlUrl } from "./config"

export type LinearGraphqlBody = {
  query: string
  variables?: Record<string, unknown>
}

export async function linearGraphql<Result = unknown>(
  token: string,
  body: LinearGraphqlBody
) {
  const response = await fetch(linearGraphqlUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const result = (await response.json()) as Result

  if (!response.ok || hasGraphqlErrors(result)) {
    throw new Error(`Linear GraphQL request failed: ${JSON.stringify(result)}`)
  }

  return result
}

function hasGraphqlErrors(result: unknown) {
  return (
    typeof result === "object" &&
    result !== null &&
    "errors" in result &&
    result.errors !== undefined
  )
}
