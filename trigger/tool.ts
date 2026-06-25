import { type ToolSurface } from "../contracts/integrations"
import { encodeToolResult } from "../contracts/transport"
import {
  materializeSandboxResult,
  prepareMiloToolInput,
  saveSandboxAttachment,
} from "./attachments"
import { isVisibleCommunicationTool } from "./communication"
import { type MiloConvexClient } from "./convex"
import { errorDetails } from "./events"
import { generateImageAttachment } from "./images/index"
import { optionalString, requiredString } from "./input"
import { type ModelToolCall } from "./model/types"
import { executeRunTool } from "./run"
import { executeCodingTool } from "./sandbox/coding"
import { type SandboxRuntime } from "./sandbox/types"
import { executeActiveSurfaceTool } from "./surface"
import { recordToolEvent, toolTraceDetails } from "./trace"
import { type JsonObject, type RuntimeContext, type RuntimeTool } from "./types"

export type ToolCallResult = {
  content: string
  finished: boolean
}

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
}): Promise<ToolCallResult> {
  const tool = findTool(args.runtime.context.tools, args.call.name)

  await recordToolEvent(eventArgs(args), tool, "tool.started")

  try {
    const result = await executeTool(args.runtime, tool, args.call)
    await recordToolEvent(
      eventArgs(args),
      tool,
      "tool.completed",
      toolTraceDetails(result.value)
    )

    return {
      content: toToolContent(result.value),
      finished: result.finished,
    }
  } catch (error) {
    const details = errorDetails(error)

    await recordToolEvent(eventArgs(args), tool, "tool.failed", details)

    return {
      content: toToolContent(toolErrorResult(details.error)),
      finished: false,
    }
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
    case "active_surface":
      return await executeActiveSurfaceTool(runtime, {
        input: call.args,
        name: call.name,
      })
    case "convex":
      return toolResult(await executeConvexTool(runtime, tool, call))
    case "run":
      return executeRunTool(runtime, {
        input: call.args,
        name: call.name,
      })
    case "sandbox":
      return toolResult(
        await executeCodingTool({
          input: call.args,
          sandbox: runtime.sandbox,
          tool: tool.name,
        })
      )
    case "subagent":
      return toolResult(await executeSubagentTool(runtime, call.args))
  }
}

async function executeConvexTool(
  runtime: ToolRuntime,
  tool: RuntimeTool,
  call: ModelToolCall
) {
  const surface = requireSurface(tool)
  const toolName = tool.tool ?? tool.name

  if (tool.mode === "prompted") {
    return await requestPromptedApproval(runtime, surface, toolName, call.args)
  }

  const result = await callConvexTool(runtime, surface, toolName, call.args)
  markVisibleCommunication(runtime, toolName, result)
  return result
}

async function requestPromptedApproval(
  runtime: ToolRuntime,
  surface: ToolSurface,
  tool: string,
  args: JsonObject
) {
  const input =
    surface === "milo" ? await prepareMiloToolInput(runtime, tool, args) : args
  const replyTarget = runtime.context.activeSurface?.target

  return await runtime.convex.requestApproval({
    input,
    ...(replyTarget === undefined || replyTarget === null
      ? {}
      : { replyTarget }),
    runId: runtime.context.run.id,
    surface,
    tool,
  })
}

export function markVisibleCommunication(
  runtime: ToolRuntime,
  toolName: string,
  result: unknown
) {
  const activeSurface = runtime.context.activeSurface

  if (
    activeSurface !== null &&
    isVisibleCommunicationTool(toolName, result, activeSurface.surface)
  ) {
    activeSurface.communicated = true
  }
}

async function callConvexTool(
  runtime: ToolRuntime,
  surface: ToolSurface,
  tool: string,
  input: JsonObject
) {
  if (surface === "milo" && tool === "save_attachment") {
    return await saveSandboxAttachment(runtime, input)
  }

  if (surface === "milo" && tool === "generate_image") {
    return await generateImageAttachment(runtime, input)
  }

  const result = await runtime.convex.callTool({
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

function eventArgs(args: {
  attempt: number
  call: ModelToolCall
  runtime: ToolRuntime
  sequence: number
}) {
  return {
    attempt: args.attempt,
    call: args.call,
    convex: args.runtime.convex,
    context: args.runtime.context,
    sequence: args.sequence,
  }
}

function toolResult(value: unknown, finished = false) {
  return { finished, value }
}

function toToolContent(result: unknown) {
  return encodeToolResult(result)
}

function toolErrorResult(message: string): JsonObject {
  return {
    error: {
      message,
    },
    status: "error",
  }
}
