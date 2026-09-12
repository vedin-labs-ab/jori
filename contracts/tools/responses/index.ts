import { assertDisjointResponseKeys } from "./common"
import { githubToolResponseSchemas } from "./github"
import { googleToolResponseSchemas } from "./google"
import { joriToolResponseSchemas } from "./jori/index"
import { linearToolResponseSchemas } from "./linear"
import { microsoftToolResponseSchemas } from "./microsoft"
import { nativeToolResponseSchemas } from "./native"
import { notionToolResponseSchemas } from "./notion"
import { slackToolResponseSchemas } from "./slack"

const responseSchemaMaps = [
  githubToolResponseSchemas,
  googleToolResponseSchemas,
  linearToolResponseSchemas,
  microsoftToolResponseSchemas,
  joriToolResponseSchemas,
  nativeToolResponseSchemas,
  notionToolResponseSchemas,
  slackToolResponseSchemas,
]

assertDisjointResponseKeys(responseSchemaMaps)

export const toolResponseSchemas: Record<string, object> = Object.assign(
  {},
  ...responseSchemaMaps
)

export function getToolResponseSchema(tool: string) {
  return toolResponseSchemas[tool]
}
