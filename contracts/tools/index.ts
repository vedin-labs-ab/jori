import { withOptionalFieldGuidance } from "./fragments/common"
import { githubToolInputSchemas } from "./github"
import { googleToolInputSchemas } from "./google"
import { loadSkillInputSchema } from "./jori/core"
import { joriToolInputSchemas } from "./jori/index"
import { linearToolInputSchemas } from "./linear"
import { microsoftToolInputSchemas } from "./microsoft"
import { notionToolInputSchemas } from "./notion"
import { slackToolInputSchemas } from "./slack"

export type { JsonSchema } from "./fragments/common"
export {
  emptyObjectSchema,
  isJsonSchema,
  optionalFieldGuidance,
  readSchemaMap,
  readString,
  schemaHasOptionalFields,
  stringArrayProperty,
  withOptionalFieldGuidance,
} from "./fragments/common"

const toolInputSchemas = {
  ...githubToolInputSchemas,
  ...googleToolInputSchemas,
  ...linearToolInputSchemas,
  ...microsoftToolInputSchemas,
  ...joriToolInputSchemas,
  ...notionToolInputSchemas,
  ...slackToolInputSchemas,
}

export function getToolInputSchema(tool: string) {
  const schema = toolInputSchemas[tool as keyof typeof toolInputSchemas]

  return schema === undefined ? undefined : withOptionalFieldGuidance(schema)
}

export function getRuntimeToolInputSchema(
  tool: string,
  args: {
    skillNames: readonly string[]
  }
) {
  if (tool === "load_skill") {
    return withOptionalFieldGuidance(loadSkillInputSchema(args.skillNames))
  }

  return getToolInputSchema(tool)
}
