import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

type Skill = {
  name: string
  description: string
  body: string
}

type Frontmatter = Partial<Pick<Skill, "name" | "description">>

const root = process.cwd()
const skillsDir = path.join(root, "skills")
const promptsDir = path.join(root, "prompts")
const outputFile = path.join(root, "convex", "prompts", "generated.ts")

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
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      Object.assign(result, await readSkills(entryPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      const content = await readFile(entryPath, "utf8")
      const skill = parseSkill(content, entryPath)
      result[skill.name] = skill
    }
  }

  return sortObject(result)
}

async function readPromptTemplates(
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
        ...(await readPromptTemplates(entryPath, id)),
      }
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      result[id.replace(/\.md$/, "")] = await readFile(entryPath, "utf8")
    }
  }

  return sortObject(result)
}

function parseSkill(content: string, filePath: string): Skill {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (match === null) {
    throw new Error(`${filePath} is missing YAML frontmatter`)
  }

  const metadata = parseFrontmatter(match[1], filePath)
  const body = match[2].trim()

  if (metadata.name === undefined || metadata.description === undefined) {
    throw new Error(`${filePath} must define name and description`)
  }

  return {
    name: metadata.name,
    description: metadata.description,
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

    if (key === "name" || key === "description") {
      result[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  }

  return result
}

function sortObject<Value>(
  value: Record<string, Value>
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  )
}
