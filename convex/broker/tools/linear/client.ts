import { linearGraphqlUrl } from "../../../integrations/linear/config"
import { fetchJsonObject } from "../../../shared/http"

export async function linearGraphql(
  token: string,
  body: Record<string, unknown>
) {
  const result = await fetchJsonObject(linearGraphqlUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
  })

  if (result?.errors !== undefined) {
    throw new Error(`Linear GraphQL request failed: ${JSON.stringify(result)}`)
  }

  return result
}
