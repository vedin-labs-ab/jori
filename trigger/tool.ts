import { type ToolSurface } from "../contracts/integrations"
import { awaitPromptedToolApproval } from "./approval"
import {
  materializeSandboxResult,
  prepareMiloToolInput,
  saveSandboxAttachment,
} from "./attachments"
import { type MiloConvexClient } from "./convex"
import { errorDetails, runtimeEvent } from "./events"
import { type ModelToolCall } from "./model/types"
import { executeCodingTool } from "./sandbox/coding"
import { type SandboxRuntime } from "./sandbox/types"
import { providerTrace } from "./trace"
import {
  type JsonObject,
  type RuntimeContext,
  type RuntimeTool,
  type RuntimeToolTraceData,
  type RuntimeValueSummary,
} from "./types"

type RuntimeToolTraceDetails = Omit<RuntimeToolTraceData, "name" | "route">

export type ToolRuntime = {
  convex: MiloConvexClient
  context: RuntimeContext
  sandbox: SandboxRuntime
}

export async function executeToolCall(args: {
  attempt: number
  call: ModelToolCall
  runtime: ToolRuntime
  sequence: number
}) {
  const tool = findTool(args.runtime.context.tools, args.call.name)

  await recordToolEvent(args, tool, "tool.started")

  try {
    const result = await executeTool(args.runtime, tool, args.call)
    await recordToolEvent(args, tool, "tool.completed", toDetails(result))

    return toToolContent(result)
  } catch (error) {
    await recordToolEvent(args, tool, "tool.failed", errorDetails(error))
    throw error
  }
}

export function modelTools(tools: RuntimeTool[]) {
  return tools
    .filter((tool) => tool.mode !== "blocked")
    .map((tool) => ({
      description: tool.description,
      inputSchema: tool.inputSchema,
      name: tool.name,
    }))
}

async function executeTool(
  runtime: ToolRuntime,
  tool: RuntimeTool,
  call: ModelToolCall
) {
  switch (tool.route) {
    case "convex":
      return await executeConvexTool(runtime, tool, call)
    case "sandbox":
      return await executeCodingTool({
        input: call.args,
        sandbox: runtime.sandbox,
        tool: tool.name,
      })
    case "subagent":
      return await executeSubagentTool(runtime, call.args)
  }
}

async function executeConvexTool(
  runtime: ToolRuntime,
  tool: RuntimeTool,
  call: ModelToolCall
) {
  const surface = requireSurface(tool)
  const toolName = tool.tool ?? tool.name

  if (tool.mode !== "prompted") {
    return await callConvexTool(runtime, surface, toolName, call.args)
  }

  const approval = await awaitPromptedToolApproval({
    call,
    runtime,
    surface,
    tool,
    toolName,
  })

  if (!approval.approved) {
    return approval.result
  }

  return await callConvexTool(runtime, surface, toolName, approval.input, true)
}

async function callConvexTool(
  runtime: ToolRuntime,
  surface: ToolSurface,
  tool: string,
  input: JsonObject,
  approved?: boolean
) {
  if (surface === "milo" && tool === "save_attachment") {
    return await saveSandboxAttachment(runtime, input)
  }

  const result = await runtime.convex.callTool({
    approved,
    input:
      surface === "milo"
        ? await prepareMiloToolInput(runtime, tool, input)
        : input,
    runId: runtime.context.run.id,
    surface,
    tool,
  })

  return await materializeSandboxResult(runtime, result)
}

async function executeSubagentTool(runtime: ToolRuntime, input: JsonObject) {
  return await runtime.convex.createChildRun({
    parentId: runtime.context.run.id,
    task: requiredString(input.task, "task"),
    title: optionalString(input.title),
  })
}

async function recordToolEvent(
  args: {
    attempt: number
    call: ModelToolCall
    runtime: ToolRuntime
    sequence: number
  },
  tool: RuntimeTool,
  type: "tool.completed" | "tool.failed" | "tool.started",
  data?: RuntimeToolTraceDetails
) {
  await args.runtime.convex.recordEvent(
    runtimeEvent({
      attempt: args.attempt,
      data: {
        name: tool.name,
        route: tool.route,
        ...data,
      },
      runId: args.runtime.context.run.id,
      sequence: args.sequence,
      source: "trigger.tool",
      callId: args.call.id,
      type,
    })
  )
}

function findTool(tools: RuntimeTool[], name: string) {
  const tool = tools.find((candidate) => candidate.name === name)

  if (tool === undefined) {
    throw new Error(`Unknown runtime tool: ${name}`)
  }

  return tool
}

function requireSurface(tool: RuntimeTool): ToolSurface {
  if (tool.surface === undefined) {
    throw new Error(`Tool has no Convex surface: ${tool.name}`)
  }

  return tool.surface
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

function toToolContent(result: unknown) {
  return JSON.stringify(result ?? null)
}

function toDetails(result: unknown): RuntimeToolTraceDetails {
  return {
    ...providerTrace(result),
    result: summarizeResult(result),
  }
}

function summarizeResult(result: unknown): RuntimeValueSummary {
  if (result === null || result === undefined) {
    return { type: "null" }
  }

  if (Array.isArray(result)) {
    return { type: "array", size: result.length }
  }

  switch (typeof result) {
    case "boolean":
      return { type: "boolean" }
    case "number":
      return { preview: String(result), type: "number" }
    case "object":
      return { type: "object", size: Object.keys(result).length }
    case "string":
      return {
        preview: result.slice(0, 500),
        size: result.length,
        type: "string",
      }
    default:
      return { type: "null" }
  }
}
