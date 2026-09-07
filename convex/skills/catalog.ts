import { v } from "convex/values"
import { skills as globalSkillSeed } from "../../skills/generated"
import {
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { checkOrganizationAccess, requireOrganizationAccess } from "../access"
import { ensureCurrentPerson } from "../persons/account"
import {
  migratingSkillSurfaces,
  normalizeSkillInput,
  requireUniqueOrganizationSkillName,
  sortSkills,
} from "./data"
import { skillCategoryValidator, skillSurfaceValidator } from "./schema"

type SeedSkill = {
  surfaces?: readonly string[]
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        skills: [],
      }
    }

    const skills = await loadSortedSkills(ctx, args.organizationId)

    return {
      status: "ready" as const,
      skills: skills.map((skill) => ({
        _id: skill._id,
        organizationId: skill.organizationId,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        surfaces: migratingSkillSurfaces(skill),
        body: skill.body,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
        scope:
          skill.organizationId === null
            ? ("global" as const)
            : ("organization" as const),
      })),
    }
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    category: skillCategoryValidator,
    surfaces: v.array(skillSurfaceValidator),
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const input = normalizeSkillInput(args)

    await requireUniqueOrganizationSkillName(
      ctx,
      args.organizationId,
      input.name
    )

    const now = Date.now()
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.db.insert("skills", {
      organizationId: args.organizationId,
      name: input.name,
      category: input.category,
      surfaces: input.surfaces,
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
    organizationId: v.string(),
    skillId: v.id("skills"),
    name: v.string(),
    category: skillCategoryValidator,
    surfaces: v.array(skillSurfaceValidator),
    description: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const skill = await ctx.db.get(args.skillId)

    if (skill === null || skill.organizationId !== args.organizationId) {
      throw new Error("Skill not found.")
    }

    const input = normalizeSkillInput(args)

    if (input.name !== skill.name) {
      await requireUniqueOrganizationSkillName(
        ctx,
        args.organizationId,
        input.name
      )
    }

    await ctx.db.patch(args.skillId, {
      name: input.name,
      category: input.category,
      surfaces: input.surfaces,
      description: input.description,
      body: input.body,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    skillId: v.id("skills"),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const skill = await ctx.db.get(args.skillId)

    if (skill === null || skill.organizationId !== args.organizationId) {
      throw new Error("Skill not found.")
    }

    await ctx.db.delete(args.skillId)
  },
})

export const listForRuntime = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const skills = await loadSortedSkills(ctx, args.organizationId)

    return skills.map((skill) => ({
      id: skill._id,
      organizationId: skill.organizationId,
      name: skill.name,
      category: skill.category,
      surfaces: migratingSkillSurfaces(skill),
      description: skill.description,
      ...(skill.communication === undefined
        ? {}
        : { communication: skill.communication }),
      body: skill.body,
    }))
  },
})

async function loadSortedSkills(ctx: QueryCtx, organizationId: string) {
  const [globalSkills, organizationSkills] = await Promise.all([
    ctx.db
      .query("skills")
      .withIndex("by_organization", (index) => index.eq("organizationId", null))
      .collect(),
    ctx.db
      .query("skills")
      .withIndex("by_organization", (index) =>
        index.eq("organizationId", organizationId)
      )
      .collect(),
  ])

  return sortSkills([...globalSkills, ...organizationSkills])
}

export const syncGlobalSkills = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const seedSkills = Object.values(globalSkillSeed) as SeedSkill[]
    const seedNames = new Set<string>(seedSkills.map((skill) => skill.name))
    const existingGlobalSkills = await ctx.db
      .query("skills")
      .withIndex("by_organization", (index) => index.eq("organizationId", null))
      .collect()

    for (const seedSkill of seedSkills) {
      const input = normalizeSkillInput(seedSkill)
      const existingSkill = existingGlobalSkills.find(
        (skill) => skill.name === input.name
      )

      if (existingSkill === undefined) {
        await ctx.db.insert("skills", {
          organizationId: null,
          name: input.name,
          category: input.category,
          surfaces: input.surfaces,
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
        surfaces: input.surfaces,
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
