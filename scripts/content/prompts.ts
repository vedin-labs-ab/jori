import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

export async function renderPromptTemplates(root: string) {
  const promptTemplates = await readPromptTemplates(path.join(root, "prompts"))

  return {
    content: [
      "export const promptTemplates = ",
      JSON.stringify(promptTemplates, null, 2),
      " as const\n\n",
      "export type PromptTemplateId = keyof typeof promptTemplates\n",
    ].join(""),
    file: path.join(root, "prompts", "generated.ts"),
  }
}

async function readPromptTemplates(
  directory: string
): Promise<Record<string, string>> {
  const sources = await readPromptSources(directory)

  return sortObject(
    Object.fromEntries(
      Object.entries(sources).map(([id, source]) => [id, source.trim()])
    )
  )
}

async function readPromptSources(
  directory: string,
  prefix = ""
): Promise<Record<string, string>> {
  const entries = await readdir(directory, { withFileTypes: true })
  let result: Record<string, string> = {}

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    const id = prefix === "" ? entry.name : `${prefix}/${entry.name}`

    if (entry.isDirectory()) {
      result = {
        ...result,
        ...(await readPromptSources(entryPath, id)),
      }
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      const promptId = id.replace(/\.md$/, "")

      validatePromptId(promptId)
      result[promptId] = await readFile(entryPath, "utf8")
    }
  }

  return sortObject(result)
}

function validatePromptId(id: string) {
  const invalidSegment = id
    .split("/")
    .find((segment) => !/^[a-z]+$/.test(segment))

  if (invalidSegment !== undefined) {
    throw new Error(
      `Prompt path segment must be a single lowercase word: ${invalidSegment}`
    )
  }
}

function sortObject<Value>(
  value: Record<string, Value>
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  )
}
