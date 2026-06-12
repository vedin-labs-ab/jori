import { type MutationCtx } from "../_generated/server"

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const skillNameMaxLength = 64
const skillDescriptionMaxLength = 320
const skillBodyMaxLength = 24_000

export function normalizeSkillInput(input: {
  name: string
  description: string
  body: string
}) {
  const name = input.name.trim().toLowerCase()
  const description = input.description.trim()
  const body = input.body.trim()

  if (!skillNamePattern.test(name) || name.length > skillNameMaxLength) {
    throw new Error(
      "Skill name must use lowercase letters, numbers, and hyphens."
    )
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

  return { name, description, body }
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
