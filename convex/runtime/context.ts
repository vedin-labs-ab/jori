import { v } from "convex/values"
import { withApprovalSchema } from "../../contracts/approvals"
import { isWebTool } from "../../contracts/permissions/web"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
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
import { getPromptedTools, toolExecutionType } from "../runs/agent/tools/policy"
import { getEnabledToolPermissions } from "../runs/agent/tools/resolve"
import {
  emptyObjectSchema,
  getToolInputSchema,
} from "../runs/agent/tools/schemas"
import { createRunToolSnapshot } from "../runs/agent/tools/snapshot"
import { toolSnapshot } from "../runs/schema"
import { sandboxTools } from "./sandbox"
import { requireWorkerSecret } from "./shared"
import { loadActiveSurface } from "./surface"
import { recordTrace } from "./traces"

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
      status: "completed" | "failed" | "queued" | "running" | "stopped"
    } | null
    if (input === null || run === null) {
      throw new Error("Runtime context not found.")
    }

    const session = await ctx.runQuery(internal.sessions.data.getByRun, {
      runId: args.runId,
    })
    const sandbox = await loadSandboxReference(ctx, {
      runId: args.runId,
      status: run.status,
    })
    const permissions = await runtimePermissions(ctx, input)
    const activeSurface = await loadActiveSurface(ctx, input, args.runId)
    const promptedTools = getPromptedTools({
      executionType: toolExecutionType(input.type),
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
      tools: createRunToolSnapshot({
        capabilities: permissions.capabilities,
        webSearch: input.type !== "automation" || input.automation.access.web,
      }),
    })

    return {
      prompt,
      run: {
        id: input.run._id,
        rootId: input.run.rootId ?? null,
        sandboxId: sandbox?.externalId ?? null,
        status: run.status,
        tenantId: input.run.tenantId,
      },
      session:
        session === null
          ? null
          : {
              id: session._id,
            },
      activeSurface: activeSurface.state,
      tools: [...activeSurface.tools, ...permissions.tools, ...sandboxTools],
    }
  },
})

async function loadSandboxReference(
  ctx: ActionCtx,
  args: {
    runId: Id<"runs">
    status: Doc<"runs">["status"]
  }
) {
  if (isTerminalStatus(args.status)) {
    return (await ctx.runQuery(internal.runtime.sandboxes.retainedByRun, {
      runId: args.runId,
    })) as { externalId: string } | null
  }

  return (await ctx.runMutation(internal.runtime.sandboxes.claimForRun, {
    runId: args.runId,
  })) as { externalId: string } | null
}

function isTerminalStatus(status: Doc<"runs">["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

export const prepareRun = internalMutation({
  args: {
    runId: v.id("runs"),
    promptId: v.id("_storage"),
    tools: toolSnapshot,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    await recordTrace(ctx, {
      run,
      key: `run:${args.runId}:prepared`,
      source: "convex.runtime",
      type: "run.prepared",
      data: {
        promptId: args.promptId,
        tools: args.tools,
      },
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
  const executionType = toolExecutionType(input.type)
  const groups: Array<{
    permissions: ToolPermission[]
    surface: ToolSurface
  }> = [
    {
      surface: "milo" as const,
      permissions: filterWebPermissions(
        input,
        getEnabledToolPermissions("milo", toolModes, executionType)
      ),
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

function filterWebPermissions(
  input: AgentRuntimeInput,
  permissions: ToolPermission[]
) {
  if (input.type !== "automation" || input.automation.access.web) {
    return permissions
  }

  return permissions.filter((permission) => !isWebTool(permission.tool))
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
    access: permission.access,
    name: permission.tool,
    description: permission.description,
    inputSchema:
      mode === "prompted" ? withApprovalSchema(inputSchema) : inputSchema,
    mode,
    route: "convex",
    surface,
  }
}
