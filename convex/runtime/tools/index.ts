import { type ToolSurface } from "../../../contracts/integrations"
import { encodeToolResult, type JsonObject } from "../../../contracts/json"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import { isVisibleCommunicationTool } from "../../../contracts/runtime/surface"
import { readFinal } from "../../../contracts/runtime/tools"
import { type WaiterWake } from "../../../contracts/runtime/waiters"
import { isParked, type Parked } from "../loop/park"
import { type ModelToolCall } from "../model/types"
import { type AgentRuntime } from "../platform"
import { recordToolResultActivity } from "../trace/activity"
import { errorDetails } from "../trace/events"
import { recordToolEvent, toolTraceDetails } from "../trace/tool"
import { executeAgentTool } from "./agent"
import { saveSandboxFile } from "./files"
import { prepareProviderToolInput } from "./github"
import { generateImageFile } from "./images"
import {
  materializeSandboxResult,
  toolErrorResult,
  toolResult,
} from "./results"
import { finishRun } from "./run"
import { executeSandboxTool } from "./sandbox"
import {
  findTool,
  requireSurface,
  shouldFinishConvexTool,
  validateRuntimeToolInput,
} from "./select"
import { executeActiveSurfaceTool } from "./surface"

export type ToolCallResult = {
  content: string
  finished: boolean
}

type ToolCallArgs = {
  call: ModelToolCall
  runtime: AgentRuntime
  sequence: number
  wake?: WaiterWake
}

type ToolExecution = { finished: boolean; value: unknown }

export async function executeToolCall(
  args: ToolCallArgs
): Promise<ToolCallResult | Parked> {
  const tool = findTool(args.runtime.context.tools, args.call.name)
  // Recorded concurrently with the tool execution and joined before the
  // outcome trace, so the started trace always lands first and a failed
  // trace write still aborts the step.
  const startedPending = recordToolEvent(eventArgs(args), tool, "tool.started")
  const onParked = async () => {
    await startedPending
    await recordToolEvent(eventArgs(args), tool, "tool.waiting")
  }
  let result: ToolExecution | Parked

  try {
    validateRuntimeToolInput(tool, args.call.args)
    result = await executeTool(args, tool, onParked)
  } catch (error) {
    await startedPending

    return await recordToolFailure(args, tool, errorDetails(error))
  }

  await startedPending

  // A parked call has no outcome yet: the run resumes into this same call
  // and records the outcome then.
  return isParked(result) ? result : await recordToolSuccess(args, tool, result)
}

async function recordToolSuccess(
  args: ToolCallArgs,
  tool: RuntimeTool,
  result: ToolExecution
): Promise<ToolCallResult> {
  try {
    await recordToolResultActivity({
      platform: args.runtime.platform,
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
  args: ToolCallArgs,
  tool: RuntimeTool,
  onParked: () => Promise<void>
): Promise<ToolExecution | Parked> {
  const { call, runtime, wake } = args

  switch (tool.route) {
    case "surface":
      return await executeActiveSurfaceTool(runtime, {
        input: call.args,
        name: call.name,
      })
    case "convex":
      return await executeConvexTool(runtime, tool, call)
    case "run":
      return await finishRun(runtime, call.args)
    case "sandbox":
      return parkedOrResult(
        await executeSandboxTool(runtime, {
          input: call.args,
          name: tool.name,
          onParked,
          wake,
        })
      )
    case "agent":
      return parkedOrResult(
        await executeAgentTool(runtime, {
          input: call.args,
          name: call.name,
          onParked,
          wake,
        })
      )
  }
}

function parkedOrResult(outcome: unknown): ToolExecution | Parked {
  return isParked(outcome) ? outcome : toolResult(outcome)
}

async function executeConvexTool(
  runtime: AgentRuntime,
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
  runtime: AgentRuntime,
  surface: ToolSurface,
  tool: string,
  args: JsonObject
) {
  const input =
    surface === "jori"
      ? args
      : await prepareProviderToolInput(runtime, surface, tool, args)
  const replyTarget = runtime.context.activeSurface?.target

  return await runtime.platform.requestApproval({
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
  runtime: AgentRuntime,
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
  runtime: AgentRuntime,
  surface: ToolSurface,
  tool: string,
  input: JsonObject
) {
  if (surface === "jori" && tool === "save_file") {
    return await saveSandboxFile(runtime, input)
  }

  if (surface === "jori" && tool === "generate_image") {
    return await generateImageFile(runtime, input)
  }

  const result = await runtime.platform.callTool({
    input:
      surface === "jori"
        ? input
        : await prepareProviderToolInput(runtime, surface, tool, input),
    runId: runtime.context.run.id,
    surface,
    tool,
  })

  return await materializeSandboxResult(runtime, result)
}

function eventArgs(args: ToolCallArgs) {
  return {
    call: args.call,
    platform: args.runtime.platform,
    context: args.runtime.context,
    sequence: args.sequence,
  }
}
