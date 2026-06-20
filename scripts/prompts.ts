import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

type Skill = {
  associatedIntegrations?: string[]
  category: string
  name: string
  description: string
  body: string
}

type Frontmatter = Partial<
  Pick<Skill, "associatedIntegrations" | "category" | "name" | "description">
>

const root = process.cwd()
const skillsDir = path.join(root, "skills")
const promptsDir = path.join(root, "prompts")
const outputFile = path.join(root, "convex", "prompts", "generated.ts")
const promptAssemblyPrefix = "assembly/"
const promptIncludePattern = /\{\{\s*include\s+"([^"]+)"\s*\}\}/g

const skills = await readSkills(skillsDir)
const promptTemplates = await readPromptTemplates(promptsDir)

await writeFile(
  outputFile,
  [
    "export const skills = ",
    JSON.stringify(skills, null, 2),
    " as const\n\n",
    "export const promptTemplates = ",
    JSON.stringify(promptTemplates, null, 2),
    " as const\n\n",
    "export type SkillId = keyof typeof skills\n",
    "export type PromptTemplateId = keyof typeof promptTemplates\n",
  ].join("")
)

async function readSkills(directory: string): Promise<Record<string, Skill>> {
  const entries = await readdir(directory, { withFileTypes: true })
  const result: Record<string, Skill> = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const skillPath = path.join(directory, entry.name, "SKILL.md")
    const content = await readFile(skillPath, "utf8")
    const skill = parseSkill(content, skillPath)
    result[skill.name] = skill
  }

  return sortObject(result)
}

async function readPromptTemplates(
  directory: string
): Promise<Record<string, string>> {
  const sources = await readPromptSources(directory)
  const entries = Object.entries(sources).filter(([id]) => isPromptAssembly(id))

  return sortObject(
    Object.fromEntries(
      entries.map(([id]) => [
        promptAssemblyId(id),
        resolvePromptTemplate(id, sources),
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

function resolvePromptTemplate(
  id: string,
  sources: Record<string, string>,
  stack: string[] = []
): string {
  const source = sources[id]

  if (source === undefined) {
    throw new Error(`Prompt template ${id} does not exist.`)
  }

  if (stack.includes(id)) {
    throw new Error(`Circular prompt include: ${[...stack, id].join(" -> ")}`)
  }

  return formatPromptTemplate(
    source.replace(promptIncludePattern, (_match, rawIncludeId: string) =>
      resolvePromptTemplate(normalizeIncludeId(rawIncludeId), sources, [
        ...stack,
        id,
      ]).trim()
    )
  )
}

function normalizeIncludeId(id: string) {
  const normalized = id.trim().replace(/\.md$/, "")

  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    normalized.includes("..")
  ) {
    throw new Error(`Invalid prompt include: ${id}`)
  }

  return normalized
}

function isPromptAssembly(id: string) {
  return id.startsWith(promptAssemblyPrefix)
}

function promptAssemblyId(id: string) {
  const assemblyId = id.slice(promptAssemblyPrefix.length)

  if (assemblyId === "") {
    throw new Error(`Invalid prompt assembly file: ${id}`)
  }

  return assemblyId
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
  return `${source.trim()}\n`
}

function parseSkill(content: string, filePath: string): Skill {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (match === null) {
    throw new Error(`${filePath} is missing YAML frontmatter`)
  }

  const metadata = parseFrontmatter(match[1], filePath)
  const body = match[2].trim()

  if (
    metadata.name === undefined ||
    metadata.description === undefined ||
    metadata.category === undefined
  ) {
    throw new Error(`${filePath} must define name, description, and category`)
  }

  if (
    metadata.associatedIntegrations === undefined ||
    metadata.associatedIntegrations.length === 0
  ) {
    return {
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      body,
    }
  }

  return {
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    associatedIntegrations: metadata.associatedIntegrations,
    body,
  }
}

function parseFrontmatter(value: string, filePath: string): Frontmatter {
  const result: Frontmatter = {}

  for (const line of value.split("\n")) {
    const index = line.indexOf(":")

    if (index === -1) {
      throw new Error(`${filePath} has invalid frontmatter line: ${line}`)
    }

    const key = line.slice(0, index).trim()
    const rawValue = line.slice(index + 1).trim()

    if (key === "associatedIntegrations") {
      result.associatedIntegrations = parseList(rawValue)
      continue
    }

    if (key === "name" || key === "description" || key === "category") {
      result[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  }

  return result
}

function parseList(value: string) {
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter((item) => item.length > 0)
}

function sortObject<Value>(
  value: Record<string, Value>
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  )
}
