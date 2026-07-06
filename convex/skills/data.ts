import { isSkillCategory } from "../../contracts/skills"
import { type MutationCtx } from "../_generated/server"
import { type Integration, integrations } from "../shared/integrations"

type SkillCommunication = {
  parts: Record<string, string>
}

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const skillCommunicationPartNamePattern = /^[a-z]+$/
const skillNameMaxLength = 64
const skillDescriptionMaxLength = 320
const skillBodyMaxLength = 24_000
const integrationNames = new Set<string>(integrations)

export function normalizeSkillInput(input: {
  associatedIntegrations?: readonly string[]
  category: string
  communication?: SkillCommunication
  name: string
  description: string
  body: string
}) {
  const name = input.name.trim().toLowerCase()
  const category = input.category.trim()
  const description = input.description.trim()
  const body = input.body.trim()
  const associatedIntegrations = normalizeAssociatedIntegrations(
    input.associatedIntegrations ?? []
  )
  const communication = normalizeCommunication(input.communication)

  if (!skillNamePattern.test(name) || name.length > skillNameMaxLength) {
    throw new Error(
      "Skill name must use lowercase letters, numbers, and hyphens."
    )
  }

  if (!isSkillCategory(category)) {
    throw new Error("Skill category is not supported.")
  }

  if (
    description.length === 0 ||
    description.length > skillDescriptionMaxLength
  ) {
    throw new Error("Skill description must be 1–320 characters.")
  }

  if (body.length === 0 || body.length > skillBodyMaxLength) {
    throw new Error("Skill instructions must be 1–24,000 characters.")
  }

  return {
    name,
    category,
    description,
    associatedIntegrations,
    ...(communication === undefined ? {} : { communication }),
    body,
  }
}

export async function requireUniqueTenantSkillName(
  ctx: MutationCtx,
  tenantId: string,
  name: string
) {
  const existingSkill = await ctx.db
    .query("skills")
    .withIndex("by_tenant_name", (index) =>
      index.eq("tenantId", tenantId).eq("name", name)
    )
    .first()

  if (existingSkill !== null) {
    throw new Error("A skill with this name already exists.")
  }
}

export function sortSkills<T extends { tenantId: string | null; name: string }>(
  skills: T[]
) {
  return [...skills].sort((left, right) => {
    if (left.tenantId === null && right.tenantId !== null) {
      return -1
    }

    if (left.tenantId !== null && right.tenantId === null) {
      return 1
    }

    return left.name.localeCompare(right.name)
  })
}

function normalizeAssociatedIntegrations(
  values: readonly string[]
): Integration[] {
  const result: Integration[] = []

  for (const value of values) {
    if (!integrationNames.has(value)) {
      throw new Error("Skill integration is not supported.")
    }

    if (!result.includes(value as Integration)) {
      result.push(value as Integration)
    }
  }

  return result
}

function normalizeCommunication(
  communication: SkillCommunication | undefined
): SkillCommunication | undefined {
  if (communication === undefined) {
    return undefined
  }

  const parts: Record<string, string> = {}

  for (const [rawName, rawBody] of Object.entries(communication.parts)) {
    const name = rawName.trim()
    const body = rawBody.trim()

    if (!skillCommunicationPartNamePattern.test(name)) {
      throw new Error("Skill communication part names must be lowercase words.")
    }

    if (body.length === 0 || body.length > skillBodyMaxLength) {
      throw new Error("Skill communication parts must be 1–24,000 characters.")
    }

    parts[name] = body
  }

  return Object.keys(parts).length === 0 ? undefined : { parts }
}
