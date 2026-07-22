import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { isSkillCategory, type SkillCategory } from "../../contracts/skills.ts"

type Skill = {
  associatedIntegrations?: string[]
  body: string
  category: SkillCategory
  communication?: {
    parts: Record<string, string>
  }
  description: string
  name: string
}

type ParsedSkill = {
  associatedIntegrations?: string[]
  category: SkillCategory
  description: string
  name: string
  overview: string
}

type Frontmatter = Partial<
  Pick<Skill, "associatedIntegrations" | "name" | "description"> & {
    category: string
  }
>

const communicationDirectoryName = "communication"
const communicationPartOrder = ["text", "rich", "interactive", "files"]

export async function writeSkills(root: string) {
  const skills = await readSkills(path.join(root, "skills"))

  await writeFile(
    path.join(root, "skills", "generated.ts"),
    [
      "export const skills = ",
      JSON.stringify(skills, null, 2),
      " as const\n",
    ].join("")
  )
}

async function readSkills(directory: string): Promise<Record<string, Skill>> {
  const entries = await readdir(directory, { withFileTypes: true })
  const result: Record<string, Skill> = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const skillDirectory = path.join(directory, entry.name)
    const skill = await readSkill(skillDirectory)
    result[skill.name] = skill
  }

  return sortObject(result)
}

async function readSkill(directory: string): Promise<Skill> {
  const skillPath = path.join(directory, "SKILL.md")
  const content = await readFile(skillPath, "utf8")
  const parsed = parseSkill(content, skillPath)
  const parts = await readCommunicationParts(directory)
  const body = formatSkillBody(parsed.overview, parts)

  return {
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    ...(parsed.associatedIntegrations === undefined
      ? {}
      : { associatedIntegrations: parsed.associatedIntegrations }),
    ...(parts === undefined ? {} : { communication: { parts } }),
    body,
  }
}

async function readCommunicationParts(directory: string) {
  const partsDirectory = path.join(directory, communicationDirectoryName)
  const entries = await readOptionalDirectory(partsDirectory)
  const parts: Record<string, string> = {}

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue
    }

    const partName = parsePartName(entry.name, partsDirectory)
    const content = await readFile(
      path.join(partsDirectory, entry.name),
      "utf8"
    )
    parts[partName] = content.trim()
  }

  return Object.keys(parts).length === 0
    ? undefined
    : sortCommunicationParts(parts)
}

async function readOptionalDirectory(directory: string) {
  try {
    return await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (isFileNotFound(error)) {
      return []
    }

    throw error
  }
}

function parseSkill(content: string, filePath: string): ParsedSkill {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (match === null) {
    throw new Error(`${filePath} is missing YAML frontmatter`)
  }

  const metadata = parseFrontmatter(match[1], filePath)
  const overview = match[2].trim()

  if (
    metadata.name === undefined ||
    metadata.description === undefined ||
    metadata.category === undefined
  ) {
    throw new Error(`${filePath} must define name, description, and category`)
  }

  if (!isSkillCategory(metadata.category)) {
    throw new Error(
      `${filePath} has an unsupported category: ${metadata.category}`
    )
  }

  return {
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    ...(metadata.associatedIntegrations === undefined ||
    metadata.associatedIntegrations.length === 0
      ? {}
      : { associatedIntegrations: metadata.associatedIntegrations }),
    overview,
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

function formatSkillBody(overview: string, parts?: Record<string, string>) {
  return [
    overview,
    ...(parts === undefined
      ? []
      : Object.entries(parts).map(([name, body]) =>
          [`## ${formatTitle(name)}`, body].join("\n\n")
        )),
  ]
    .filter((section) => section.length > 0)
    .join("\n\n")
}

function sortCommunicationParts(parts: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(parts).sort(([left], [right]) =>
      comparePartNames(left, right)
    )
  )
}

function comparePartNames(left: string, right: string) {
  const leftIndex = communicationPartOrder.indexOf(left)
  const rightIndex = communicationPartOrder.indexOf(right)

  if (leftIndex !== -1 || rightIndex !== -1) {
    return normalizePartIndex(leftIndex) - normalizePartIndex(rightIndex)
  }

  return left.localeCompare(right)
}

function normalizePartIndex(index: number) {
  return index === -1 ? Number.POSITIVE_INFINITY : index
}

function parsePartName(fileName: string, directory: string) {
  const partName = fileName.replace(/\.md$/, "")

  if (!/^[a-z]+$/.test(partName)) {
    throw new Error(
      `Communication part names must be lowercase words: ${directory}/${fileName}`
    )
  }

  return partName
}

function parseList(value: string) {
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter((item) => item.length > 0)
}

function formatTitle(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function sortObject<Value>(
  value: Record<string, Value>
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  )
}

function isFileNotFound(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}
