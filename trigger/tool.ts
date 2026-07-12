import { type ToolSurface } from "../contracts/integrations"
import { isVisibleCommunicationTool, readFinal } from "../contracts/runtime"
import { encodeToolResult } from "../contracts/transport"
import {
  materializeSandboxResult,
  prepareMiloToolInput,
  saveSandboxAsset,
} from "./assets"
import { errorDetails } from "./events"
import { generateImageAsset } from "./images/index"
import { optionalStringList, requiredString } from "./input"
import { type ModelToolCall } from "./model/types"
import { executeRunTool } from "./run"
import { recordToolResultActivity } from "./runs/activity"
import { waitForAgents } from "./runs/agents"
import { executeCodingTool } from "./sandbox/coding"
import { prepareProviderToolInput } from "./sandbox/source"
import { executeActiveSurfaceTool } from "./surface"
import { toolErrorResult, toolResult } from "./tool/results"
import { type ToolRuntime } from "./tool/runtime"
import { findTool, requireSurface, shouldFinishConvexTool } from "./tool/select"
import { recordToolEvent, toolTraceDetails } from "./trace"
import { type JsonObject, type RuntimeTool } from "./types"

export type { ToolRuntime } from "./tool/runtime"

export type ToolCallResult = {
  content: string
  finished: boolean
}

export async function executeToolCall(
  args: ToolCallArgs
): Promise<ToolCallResult> {
  const tool = findTool(args.runtime.context.tools, args.call.name)
  // Recorded concurrently with the tool execution and joined before the
  // outcome trace, so the started trace always lands first and a failed
  // trace write still aborts the attempt.
  const startedPending = recordToolEvent(eventArgs(args), tool, "tool.started")
  let result: Awaited<ReturnType<typeof executeTool>>

  try {
    result = await executeTool(args.runtime, tool, args.call)
  } catch (error) {
    await startedPending

    return await recordToolFailure(args, tool, errorDetails(error))
  }

  await startedPending

  return await recordToolSuccess(args, tool, result)
}

type ToolCallArgs = {
  attempt: number
  call: ModelToolCall
  runtime: ToolRuntime
  sequence: number
}

async function recordToolSuccess(
  args: ToolCallArgs,
  tool: RuntimeTool,
  result: Awaited<ReturnType<typeof executeTool>>
): Promise<ToolCallResult> {
  try {
    await recordToolResultActivity({
      convex: args.runtime.convex,
      context: args.runtime.context,
      result: result.value,
      sequence: args.sequence,
      toolName: tool.name,
    })
    await recordToolEvent(
      eventArgs(args),
      tool,
      "tool.completed",
      toolTraceDetails(result.value)
    )

    return {
      content: encodeToolResult(result.value),
      finished: result.finished,
    }
  } catch (error) {
    return await recordToolFailure(args, tool, errorDetails(error))
  }
}

async function recordToolFailure(
  args: ToolCallArgs,
  tool: RuntimeTool,
  details: ReturnType<typeof errorDetails>
): Promise<ToolCallResult> {
  await recordToolEvent(eventArgs(args), tool, "tool.failed", details)

  return {
    content: encodeToolResult(toolErrorResult(details.error)),
    finished: false,
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
    case "surface":
      return await executeActiveSurfaceTool(runtime, {
        input: call.args,
        name: call.name,
      })
    case "convex":
      return await executeConvexTool(runtime, tool, call)
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
    case "agent":
      return toolResult(await executeAgentTool(runtime, call.name, call.args))
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
    const finished = readFinal(call.args)

    return toolResult(
      await requestPromptedApproval(runtime, surface, toolName, call.args),
      finished
    )
  }

  const finished = shouldFinishConvexTool(toolName, call.args)
  const result = await callConvexTool(runtime, surface, toolName, call.args)
  markVisibleCommunication(runtime, toolName, result)
  return toolResult(result, finished)
}

async function requestPromptedApproval(
  runtime: ToolRuntime,
  surface: ToolSurface,
  tool: string,
  args: JsonObject
) {
  const input =
    surface === "milo"
      ? await prepareMiloToolInput(runtime, tool, args)
      : await prepareProviderToolInput(runtime, surface, tool, args)
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
  if (surface === "milo" && tool === "save_asset") {
    return await saveSandboxAsset(runtime, input)
  }

  if (surface === "milo" && tool === "generate_image") {
    return await generateImageAsset(runtime, input)
  }

  const result = await runtime.convex.callTool({
    input:
      surface === "milo"
        ? await prepareMiloToolInput(runtime, tool, input)
        : await prepareProviderToolInput(runtime, surface, tool, input),
    runId: runtime.context.run.id,
    surface,
    tool,
  })

  return await materializeSandboxResult(runtime, result)
}

async function executeAgentTool(
  runtime: ToolRuntime,
  name: string,
  input: JsonObject
) {
  if (name === "wait_for_agents") {
    return await waitForAgents(runtime, input)
  }

  if (name === "start_agent") {
    return await runtime.convex.createAgentRun({
      parentId: runtime.context.run.id,
      task: requiredString(input.task, "task"),
      title: requiredString(input.title, "title"),
      tools: optionalStringList(input.tools),
    })
  }

  throw new Error(`Unknown agent tool: ${name}`)
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
