import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, action, internalMutation } from "../_generated/server"
import { getIntegrationTools } from "../automations/access"
import { type CodexRuntimeInput } from "../executions/agent/codex"
import { assemblePrompt } from "../executions/agent/prompt"
import { createRuntimeToolCapability } from "../executions/agent/tools/bundles"
import { getPromptedTools } from "../executions/agent/tools/policy"
import { getEnabledToolPermissions } from "../executions/agent/tools/resolve"
import {
  emptyObjectSchema,
  getToolInputSchema,
} from "../executions/agent/tools/schemas"
import { createExecutionToolSnapshot } from "../executions/agent/tools/snapshot"
import {
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  type ToolPermission,
  type ToolSurface,
} from "../permissions/catalog"
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
    executionId: v.id("executions"),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    const input = (await ctx.runQuery(
      internal.executions.records.getInputByRun,
      {
        runId: args.runId,
      }
    )) as CodexRuntimeInput | null
    const execution = (await ctx.runQuery(internal.executions.records.get, {
      executionId: args.executionId,
    })) as { _id: Id<"executions">; sandboxId?: string } | null

    if (input === null || execution === null) {
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

    await ctx.runMutation(internal.runtime.context.prepareExecution, {
      executionId: args.executionId,
      promptId,
      toolSnapshot: createExecutionToolSnapshot({
        capabilities: permissions.capabilities,
        webSearch: input.type !== "automation" || input.automation.access.web,
      }),
    })

    return {
      execution: {
        id: execution._id,
        sandboxId: execution.sandboxId ?? null,
      },
      prompt,
      run: {
        id: input.run._id,
        rootRunId: input.run.rootRunId ?? null,
        task: input.run.task,
        tenantId: input.run.tenantId,
        title: input.run.title,
      },
      tools: [...permissions.tools, ...sandboxTools],
    }
  },
})

export const prepareExecution = internalMutation({
  args: {
    executionId: v.id("executions"),
    promptId: v.id("_storage"),
    toolSnapshot: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      promptId: args.promptId,
      toolSnapshot: args.toolSnapshot,
    })

    return null
  },
})

async function runtimePermissions(ctx: ActionCtx, input: CodexRuntimeInput) {
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
  input: CodexRuntimeInput,
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
  input: CodexRuntimeInput,
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
