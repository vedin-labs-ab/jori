import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { skills as globalSkillSeed } from "../prompts/generated"

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const skillNameMaxLength = 64
const skillDescriptionMaxLength = 320
const skillBodyMaxLength = 24_000

export const list = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const [globalSkills, tenantSkills] = await Promise.all([
      ctx.db
        .query("skills")
        .withIndex("by_tenant", (index) => index.eq("tenantId", null))
        .collect(),
      ctx.db
        .query("skills")
        .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
        .collect(),
    ])

    return sortSkills([...globalSkills, ...tenantSkills]).map((skill) => ({
      _id: skill._id,
      tenantId: skill.tenantId,
      name: skill.name,
      description: skill.description,
      body: skill.body,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      scope:
        skill.tenantId === null ? ("global" as const) : ("tenant" as const),
    }))
  },
})

export const create = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const input = normalizeSkillInput(args)

    await requireUniqueTenantSkillName(ctx, args.tenantId, input.name)

    const now = Date.now()

    return await ctx.db.insert("skills", {
      tenantId: args.tenantId,
      name: input.name,
      description: input.description,
      body: input.body,
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    tenantId: v.string(),
    skillId: v.id("skills"),
    name: v.string(),
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const skill = await ctx.db.get(args.skillId)

    if (skill === null || skill.tenantId !== args.tenantId) {
      throw new Error("Skill not found")
    }

    const input = normalizeSkillInput(args)

    if (input.name !== skill.name) {
      await requireUniqueTenantSkillName(ctx, args.tenantId, input.name)
    }

    await ctx.db.patch(args.skillId, {
      name: input.name,
      description: input.description,
      body: input.body,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: {
    tenantId: v.string(),
    skillId: v.id("skills"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const skill = await ctx.db.get(args.skillId)

    if (skill === null || skill.tenantId !== args.tenantId) {
      throw new Error("Skill not found")
    }

    await ctx.db.delete(args.skillId)
  },
})

export const listForRuntime = internalQuery({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const [globalSkills, tenantSkills] = await Promise.all([
      ctx.db
        .query("skills")
        .withIndex("by_tenant", (index) => index.eq("tenantId", null))
        .collect(),
      ctx.db
        .query("skills")
        .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
        .collect(),
    ])

    return sortSkills([...globalSkills, ...tenantSkills]).map((skill) => ({
      id: skill._id,
      tenantId: skill.tenantId,
      name: skill.name,
      description: skill.description,
      body: skill.body,
    }))
  },
})

export const syncGlobalSkills = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const seedSkills = Object.values(globalSkillSeed)
    const seedNames = new Set<string>(seedSkills.map((skill) => skill.name))
    const existingGlobalSkills = await ctx.db
      .query("skills")
      .withIndex("by_tenant", (index) => index.eq("tenantId", null))
      .collect()

    for (const seedSkill of seedSkills) {
      const input = normalizeSkillInput(seedSkill)
      const existingSkill = existingGlobalSkills.find(
        (skill) => skill.name === input.name
      )

      if (existingSkill === undefined) {
        await ctx.db.insert("skills", {
          tenantId: null,
          name: input.name,
          description: input.description,
          body: input.body,
          createdAt: now,
          updatedAt: now,
        })
        continue
      }

      await ctx.db.patch(existingSkill._id, {
        description: input.description,
        body: input.body,
        updatedAt: now,
      })
    }

    for (const skill of existingGlobalSkills) {
      if (!seedNames.has(skill.name)) {
        await ctx.db.delete(skill._id)
      }
    }
  },
})

function normalizeSkillInput(input: {
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
    throw new Error("Skill description must be 1-320 characters.")
  }

  if (body.length === 0 || body.length > skillBodyMaxLength) {
    throw new Error("Skill instructions must be 1-24000 characters.")
  }

  return { name, description, body }
}

async function requireUniqueTenantSkillName(
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
    throw new Error("A tenant skill with this name already exists.")
  }
}

async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx,
  tenantId: string
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new Error("Unauthorized")
  }

  if (readIdentityTenantId(identity) !== tenantId) {
    throw new Error("Unauthorized")
  }

  return identity
}

function readIdentityTenantId(identity: Record<string, unknown>) {
  const candidates = [
    identity.orgId,
    identity.org_id,
    identity.organizationId,
    identity.organization_id,
    identity["https://clerk.com/org_id"],
  ]

  return candidates.find((candidate) => typeof candidate === "string")
}

function sortSkills<T extends { tenantId: string | null; name: string }>(
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
