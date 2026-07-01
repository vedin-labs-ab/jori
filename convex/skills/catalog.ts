import { v } from "convex/values"
import { skills as globalSkillSeed } from "../../prompts/generated"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import { ensureCurrentPerson } from "../persons/clerk"
import { integrationValidator } from "../shared/integrations"
import {
  normalizeSkillInput,
  requireUniqueTenantSkillName,
  sortSkills,
} from "./data"

type SeedSkill = {
  associatedIntegrations?: readonly string[]
  category: string
  communication?: {
    parts: Record<string, string>
  }
  name: string
  description: string
  body: string
}

export const list = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        skills: [],
      }
    }

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

    return {
      status: "ready" as const,
      skills: sortSkills([...globalSkills, ...tenantSkills]).map((skill) => ({
        _id: skill._id,
        tenantId: skill.tenantId,
        name: skill.name,
        description: skill.description,
        category: skill.category ?? "General",
        associatedIntegrations: skill.associatedIntegrations ?? [],
        body: skill.body,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
        scope:
          skill.tenantId === null ? ("global" as const) : ("tenant" as const),
      })),
    }
  },
})

export const create = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    category: v.string(),
    associatedIntegrations: v.array(integrationValidator),
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const input = normalizeSkillInput(args)

    await requireUniqueTenantSkillName(ctx, args.tenantId, input.name)

    const now = Date.now()
    const personId = await ensureCurrentPerson(ctx, args.tenantId)

    return await ctx.db.insert("skills", {
      tenantId: args.tenantId,
      name: input.name,
      category: input.category,
      associatedIntegrations: input.associatedIntegrations,
      description: input.description,
      body: input.body,
      createdBy: personId,
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
    category: v.string(),
    associatedIntegrations: v.array(integrationValidator),
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const skill = await ctx.db.get(args.skillId)

    if (skill === null || skill.tenantId !== args.tenantId) {
      throw new Error("Skill not found.")
    }

    const input = normalizeSkillInput(args)

    if (input.name !== skill.name) {
      await requireUniqueTenantSkillName(ctx, args.tenantId, input.name)
    }

    await ctx.db.patch(args.skillId, {
      name: input.name,
      category: input.category,
      associatedIntegrations: input.associatedIntegrations,
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
      throw new Error("Skill not found.")
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
      category: skill.category ?? "General",
      associatedIntegrations: skill.associatedIntegrations ?? [],
      description: skill.description,
      ...(skill.communication === undefined
        ? {}
        : { communication: skill.communication }),
      body: skill.body,
    }))
  },
})

export const syncGlobalSkills = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const seedSkills = Object.values(globalSkillSeed) as SeedSkill[]
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
          category: input.category,
          associatedIntegrations: input.associatedIntegrations,
          ...(input.communication === undefined
            ? {}
            : { communication: input.communication }),
          description: input.description,
          body: input.body,
          createdAt: now,
          updatedAt: now,
        })
        continue
      }

      await ctx.db.patch(existingSkill._id, {
        category: input.category,
        associatedIntegrations: input.associatedIntegrations,
        communication: input.communication,
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
