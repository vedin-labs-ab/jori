import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

export async function renderPromptTemplates(root: string) {
  const sources: Record<string, string> = {}
  await readPromptSources(path.join(root, "prompts"), "", sources)
  const promptTemplates = Object.fromEntries(
    Object.entries(sources).sort(([left], [right]) => left.localeCompare(right))
  )

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

async function readPromptSources(
  directory: string,
  prefix: string,
  sources: Record<string, string>
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    const id = prefix === "" ? entry.name : `${prefix}/${entry.name}`

    if (entry.isDirectory()) {
      await readPromptSources(entryPath, id, sources)
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      const promptId = id.replace(/\.md$/, "")

      validatePromptId(promptId)
      sources[promptId] = (await readFile(entryPath, "utf8")).trim()
    }
  }
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
