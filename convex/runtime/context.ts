import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, action, internalMutation } from "../_generated/server"
import { getIntegrationTools } from "../automations/access"
import {
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  type ToolPermission,
  type ToolSurface,
} from "../permissions/catalog"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { assemblePrompt } from "../runs/agent/prompt"
import { createRuntimeToolCapability } from "../runs/agent/tools/bundles"
import { getPromptedTools } from "../runs/agent/tools/policy"
import { getEnabledToolPermissions } from "../runs/agent/tools/resolve"
import {
  emptyObjectSchema,
  getToolInputSchema,
} from "../runs/agent/tools/schemas"
import { createRunToolSnapshot } from "../runs/agent/tools/snapshot"
import { withApprovalSchema } from "./schemas"
import { requireWorkerSecret } from "./shared"

const sandboxTools = [
  {
    name: "sandbox_run_command",
    description: "Run a shell command in the run sandbox.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["command"],
      properties: {
        command: { type: "string" },
        cwd: { type: "string" },
        timeoutMs: { type: "number" },
      },
    },
    route: "sandbox",
  },
  {
    name: "spawn_subagent",
    description: "Start a child Milo agent run for a delegated task.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["task"],
      properties: {
        task: { type: "string" },
        title: { type: "string" },
      },
    },
    route: "subagent",
  },
] as const

export const load = action({
  args: {
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
      runId: args.runId,
    })) as AgentRuntimeInput | null
    const run = (await ctx.runQuery(internal.runs.records.get, {
      runId: args.runId,
    })) as {
      _id: Id<"runs">
      sandboxId?: string
      status: "completed" | "failed" | "queued" | "running" | "stopped"
    } | null
    const session = await ctx.runQuery(internal.sessions.data.getByRun, {
      runId: args.runId,
    })

    if (input === null || run === null) {
      throw new Error("Runtime context not found.")
    }

    const permissions = await runtimePermissions(ctx, input)
    const promptedTools = getPromptedTools({
      executionType: input.type,
      permissions: permissions.all,
      toolModes: permissions.toolModes,
    })
    const prompt = assemblePrompt(input, promptedTools)
    const promptId = await ctx.storage.store(
      new Blob([prompt], { type: "text/markdown" })
    )

    await ctx.runMutation(internal.runtime.context.prepareRun, {
      runId: args.runId,
      promptId,
      toolSnapshot: createRunToolSnapshot({
        capabilities: permissions.capabilities,
        webSearch: input.type !== "automation" || input.automation.access.web,
      }),
    })

    return {
      prompt,
      run: {
        id: input.run._id,
        rootRunId: input.run.rootRunId ?? null,
        sandboxId: run.sandboxId ?? null,
        status: run.status,
        task: input.run.task,
        tenantId: input.run.tenantId,
        title: input.run.title,
      },
      session:
        session === null
          ? null
          : {
              id: session._id,
            },
      tools: [...permissions.tools, ...sandboxTools],
    }
  },
})

export const prepareRun = internalMutation({
  args: {
    runId: v.id("runs"),
    promptId: v.id("_storage"),
    toolSnapshot: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      promptId: args.promptId,
      toolSnapshot: args.toolSnapshot,
    })

    return null
  },
})

async function runtimePermissions(ctx: ActionCtx, input: AgentRuntimeInput) {
  const overrides = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: input.run.tenantId,
    }
  )
  const toolModes = resolveToolModes(overrides)
  const groups = permissionGroups(input, toolModes)
  const capabilities = groups.map((group) =>
    createRuntimeToolCapability(group.surface, group.permissions, toolModes)
  )
  const tools = groups.flatMap((group) =>
    group.permissions.map((permission) =>
      toolDescriptor(group.surface, permission, toolModes)
    )
  )

  return {
    all: groups.flatMap((group) => group.permissions),
    capabilities,
    tools,
    toolModes,
  }
}

function permissionGroups(
  input: AgentRuntimeInput,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  const executionType = input.type
  const groups: Array<{
    permissions: ToolPermission[]
    surface: ToolSurface
  }> = [
    {
      surface: "milo" as const,
      permissions: getEnabledToolPermissions("milo", toolModes, executionType),
    },
  ]
  const seen = new Set<ToolSurface>(["milo"])

  for (const integration of input.integrations) {
    const surface = integration.integration as ToolSurface

    if (seen.has(surface)) {
      continue
    }

    seen.add(surface)
    groups.push({
      surface,
      permissions: getEnabledToolPermissions(
        surface,
        toolModes,
        executionType,
        selectedTools(input, integration._id)
      ),
    })
  }

  return groups.filter((group) => group.permissions.length > 0)
}

function selectedTools(
  input: AgentRuntimeInput,
  integrationId: Id<"integrations">
) {
  return input.type === "automation"
    ? getIntegrationTools(input.automation.access, integrationId)
    : undefined
}

function toolDescriptor(
  surface: ToolSurface,
  permission: ToolPermission,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  const mode = resolveToolMode(toolModes, permission.tool)
  const inputSchema = getToolInputSchema(permission.tool) ?? emptyObjectSchema()

  return {
    name: permission.tool,
    description: permission.description,
    inputSchema:
      mode === "prompted" ? withApprovalSchema(inputSchema) : inputSchema,
    mode,
    route: "convex",
    surface,
  }
}
