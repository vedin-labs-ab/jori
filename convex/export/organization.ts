import { v } from "convex/values"
import { components } from "../_generated/api"
import { internalQuery } from "../_generated/server"
import { authComponent, createAdapterOptions } from "../auth"

export const summary = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const adapter = authComponent.adapter(ctx)(createAdapterOptions())
    const row = await adapter.findOne<{
      id: string
      name: string
      slug: string
      createdAt: number
    }>({
      model: "organization",
      where: [{ field: "id", value: args.organizationId }],
    })
    return row
      ? {
          _id: row.id,
          name: row.name,
          slug: row.slug,
          createdAt: row.createdAt,
        }
      : null
  },
})

export const page = internalQuery({
  args: {
    organizationId: v.string(),
    model: v.union(
      v.literal("member"),
      v.literal("invitation"),
      v.literal("team")
    ),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: args.model,
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: { cursor: args.cursor, numItems: 20 },
    })
    const page: Record<string, unknown>[] = []
    for (const item of result.page) {
      const row = item as Record<string, unknown>
      if (row.organizationId !== args.organizationId) {
        continue
      }
      const fields =
        args.model === "member"
          ? ["_id", "organizationId", "userId", "role", "createdAt"]
          : args.model === "invitation"
            ? [
                "_id",
                "organizationId",
                "email",
                "role",
                "teamId",
                "status",
                "createdAt",
                "expiresAt",
                "inviterId",
              ]
            : ["_id", "organizationId", "name", "createdAt", "updatedAt"]
      const record = Object.fromEntries(
        fields
          .filter((key) => row[key] !== undefined)
          .map((key) => [key, row[key]])
      )
      if (args.model === "member" && typeof row.userId === "string") {
        const user = await authComponent.getAnyUserById(ctx, row.userId)
        if (user) {
          Object.assign(record, { name: user.name, email: user.email })
        }
      }
      page.push(record)
    }
    return { ...result, page }
  },
})

export const team = internalQuery({
  args: {
    organizationId: v.string(),
    teamId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const adapter = authComponent.adapter(ctx)(createAdapterOptions())
    const parent = await adapter.findOne<{ organizationId: string }>({
      model: "team",
      where: [{ field: "id", value: args.teamId }],
    })
    if (parent?.organizationId !== args.organizationId) {
      throw new Error("Team does not belong to this workspace")
    }
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "teamMember",
      where: [{ field: "teamId", value: args.teamId }],
      paginationOpts: { cursor: args.cursor, numItems: 20 },
    })
    return {
      ...result,
      page: result.page
        .filter((item: Record<string, unknown>) => item.teamId === args.teamId)
        .map((item: unknown) => {
          const row = item as Record<string, unknown>
          return {
            _id: row._id,
            teamId: row.teamId,
            userId: row.userId,
            createdAt: row.createdAt,
          }
        }),
    }
  },
})
