import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { scopeValidator } from "../shared/audience"
import { findAccessibleTable, searchTables, summarizeTable } from "./access"

export const list = query({
  args: {
    organizationId: v.string(),
    query: v.string(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        tables: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const tables = await searchTables(ctx, {
      organizationId: args.organizationId,
      personId,
      query: args.query,
      includeArchived: args.includeArchived,
      limit: 100,
    })

    return {
      status: "ready" as const,
      tables: tables.map((table) => summarizeTable(table)),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        table: null,
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const table = await findAccessibleTable(ctx, { ...args, personId })

    if (table === null) {
      return { status: "not_found" as const, table: null }
    }

    return { status: "ready" as const, table: summarizeTable(table) }
  },
})

export const pageRows = query({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    rows: Array<{
      rowId: Id<"tableRows">
      values: Record<string, unknown>
      version: number
      createdAt: number
      updatedAt: number
    }>
    isDone: boolean
    continueCursor: string
  }> => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    return await ctx.runQuery(internal.tables.rows.page, {
      ...args,
      personId,
    })
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    columns: v.any(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.records.create, {
      ...args,
      personId,
    })
  },
})

export const update = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.records.update, {
      ...args,
      personId,
    })
  },
})

export const insertRow = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    values: v.any(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.rows.insert, {
      ...args,
      personId,
    })
  },
})

export const insertRows = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.rows.insertMany, {
      ...args,
      personId,
    })
  },
})

export const updateRow = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    rowId: v.id("tableRows"),
    values: v.any(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.rows.update, {
      ...args,
      personId,
    })
  },
})

export const removeRow = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    rowId: v.id("tableRows"),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ rowId: Id<"tableRows">; deleted: true }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.rows.remove, {
      ...args,
      personId,
    })
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ tableId: Id<"tables">; archived?: true; deleted?: true }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.records.remove, {
      ...args,
      personId,
    })
  },
})

export const restore = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ tableId: Id<"tables">; restored: true }> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.records.restore, {
      ...args,
      personId,
    })
  },
})
