import { assertDisjointResponseKeys } from "./common"
import { githubToolResponseSchemas } from "./github"
import { googleToolResponseSchemas } from "./google"
import { linearToolResponseSchemas } from "./linear"
import { microsoftToolResponseSchemas } from "./microsoft"
import { miloToolResponseSchemas } from "./milo/index"
import { nativeToolResponseSchemas } from "./native"
import { notionToolResponseSchemas } from "./notion"
import { slackToolResponseSchemas } from "./slack"

const responseSchemaMaps = [
  githubToolResponseSchemas,
  googleToolResponseSchemas,
  linearToolResponseSchemas,
  microsoftToolResponseSchemas,
  miloToolResponseSchemas,
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
