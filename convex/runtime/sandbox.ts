import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type ToolAccess } from "../../contracts/permissions"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { withOptionalFieldGuidance } from "../runs/agent/tools/schemas"
import { nativeToolUsage } from "./permissions/native"

export const sandboxTools = [
  ...codingToolDefinitions.map((tool) => ({
    ...tool,
    access: codingToolAccess(tool.name),
    inputSchema: withOptionalFieldGuidance(tool.inputSchema),
    route: "sandbox" as const,
  })),
  {
    access: "write" as const,
    name: "start_agent",
    description: nativeToolUsage("start_agent", "agent"),
    inputSchema: withOptionalFieldGuidance({
      type: "object",
      additionalProperties: false,
      required: ["task"],
      properties: {
        task: { type: "string" },
        title: { type: "string" },
      },
    }),
    route: "agent",
  },
] as const

function codingToolAccess(name: CodingToolName): ToolAccess {
  switch (name) {
    case "glob":
    case "grep":
    case "git":
    case "read":
      return "read"
    case "apply_patch":
    case "bash":
      return "write"
  }
}

type QueryLikeCtx = MutationCtx | QueryCtx

export async function findActiveSandbox(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "active")
    )
    .order("desc")
    .first()
}

export async function findSandboxByExternalId(
  ctx: QueryLikeCtx,
  externalId: string
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_external_id", (query) => query.eq("externalId", externalId))
    .first()
}

export async function findSessionByRun(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}
