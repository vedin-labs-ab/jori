import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { skills as globalSkillSeed } from "../prompts/generated"
import {
  normalizeSkillInput,
  requireUniqueTenantSkillName,
  sortSkills,
} from "./data"

type SeedSkill = {
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
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const input = normalizeSkillInput(args)

    await requireUniqueTenantSkillName(ctx, args.tenantId, input.name)

    const now = Date.now()
    const userId = requireClerkUserId(identity)

    return await ctx.db.insert("skills", {
      tenantId: args.tenantId,
      name: input.name,
      description: input.description,
      body: input.body,
      createdBy: userId,
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
      throw new Error("Skill not found.")
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
      description: skill.description,
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
