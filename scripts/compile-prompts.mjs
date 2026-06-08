import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

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

async function readSkills(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const result = {}

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

async function readPromptTemplates(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true })
  let result = {}

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

function parseSkill(content, filePath) {
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

function parseFrontmatter(value, filePath) {
  const result = {}

  for (const line of value.split("\n")) {
    const index = line.indexOf(":")

    if (index === -1) {
      throw new Error(`${filePath} has invalid frontmatter line: ${line}`)
    }

    const key = line.slice(0, index).trim()
    const rawValue = line.slice(index + 1).trim()
    result[key] = rawValue.replace(/^["']|["']$/g, "")
  }

  return result
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  )
}
