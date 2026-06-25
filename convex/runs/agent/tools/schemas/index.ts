import { githubToolInputSchemas } from "./github"
import { googleToolInputSchemas } from "./google"
import { linearToolInputSchemas } from "./linear"
import { microsoftToolInputSchemas } from "./microsoft"
import { loadSkillInputSchema } from "./milo/core"
import { miloToolInputSchemas } from "./milo/index"
import { notionToolInputSchemas } from "./notion"
import { slackToolInputSchemas } from "./slack"

export { emptyObjectSchema } from "./common"

const toolInputSchemas = {
  ...githubToolInputSchemas,
  ...googleToolInputSchemas,
  ...linearToolInputSchemas,
  ...microsoftToolInputSchemas,
  ...miloToolInputSchemas,
  ...notionToolInputSchemas,
  ...slackToolInputSchemas,
}

export function getToolInputSchema(tool: string) {
  return toolInputSchemas[tool as keyof typeof toolInputSchemas]
}

export function getRuntimeToolInputSchema(
  tool: string,
  args: {
    skillNames: readonly string[]
  }
) {
  if (tool === "load_skill") {
    return loadSkillInputSchema(args.skillNames)
  }

  return getToolInputSchema(tool)
}
