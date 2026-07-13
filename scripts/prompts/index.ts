import { writeFile } from "node:fs/promises"
import path from "node:path"
import { readPromptTemplates } from "./read.ts"

const root = process.cwd()
const promptTemplates = await readPromptTemplates(path.join(root, "prompts"))

await writeFile(
  path.join(root, "prompts", "generated.ts"),
  [
    "export const promptTemplates = ",
    JSON.stringify(promptTemplates, null, 2),
    " as const\n\n",
    "export type PromptTemplateId = keyof typeof promptTemplates\n",
  ].join("")
)
