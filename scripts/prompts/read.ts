import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

export async function readPromptTemplates(
  directory: string
): Promise<Record<string, string>> {
  const sources = await readPromptSources(directory)

  return sortObject(
    Object.fromEntries(
      Object.entries(sources).map(([id, source]) => [
        id,
        formatPromptTemplate(source),
      ])
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

function formatPromptTemplate(source: string) {
  return source.trim()
}

function sortObject<Value>(
  value: Record<string, Value>
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  )
}
