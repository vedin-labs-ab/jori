import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type ToolAccess } from "../../contracts/permissions"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  stringArrayProperty,
  withOptionalFieldGuidance,
} from "../runs/agent/tools/schemas"
import { type QueryLikeCtx } from "../shared/context"
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
      required: ["task", "title"],
      properties: {
        task: {
          type: "string",
          description: "Complete instructions for the delegated work.",
        },
        title: {
          type: "string",
          description: "Concise title that identifies the delegated work.",
        },
        tools: stringArrayProperty(
          "Integration and web tool names the agent may use, exact names from your own tools. Omit to pass on your full access. Grant the smallest set that covers the task; names outside your own access are dropped. Core Milo tools are always included."
        ),
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
