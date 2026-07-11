import { withOptionalFieldGuidance } from "./common"
import { githubToolInputSchemas } from "./github"
import { googleToolInputSchemas } from "./google"
import { linearToolInputSchemas } from "./linear"
import { microsoftToolInputSchemas } from "./microsoft"
import { loadSkillInputSchema } from "./milo/core"
import { miloToolInputSchemas } from "./milo/index"
import { notionToolInputSchemas } from "./notion"
import { slackToolInputSchemas } from "./slack"

export type { JsonSchema, SchemaMap } from "./common"
export {
  emptyObjectSchema,
  isJsonSchema,
  optionalFieldGuidance,
  readNumber,
  readSchemaMap,
  readString,
  readStringArray,
  schemaHasOptionalFields,
  stringArrayProperty,
  withOptionalFieldGuidance,
} from "./common"

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
