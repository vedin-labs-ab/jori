import { githubToolInputSchemas } from "./github"
import { googleToolInputSchemas } from "./google"
import { linearToolInputSchemas } from "./linear"
import { microsoftToolInputSchemas } from "./microsoft"
import { notionToolInputSchemas } from "./notion"
import { slackToolInputSchemas } from "./slack"

export { emptyObjectSchema } from "./common"

const toolInputSchemas = {
  ...githubToolInputSchemas,
  ...googleToolInputSchemas,
  ...linearToolInputSchemas,
  ...microsoftToolInputSchemas,
  ...notionToolInputSchemas,
  ...slackToolInputSchemas,
}

export function getToolInputSchema(tool: string) {
  return toolInputSchemas[tool as keyof typeof toolInputSchemas]
}
