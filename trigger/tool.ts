import { type ToolSurface } from "../contracts/integrations"
import { isVisibleCommunicationTool, readFinal } from "../contracts/runtime"
import {
  materializeSandboxResult,
  prepareMiloToolInput,
  saveSandboxAsset,
} from "./assets"
import { type MiloConvexClient } from "./convex"
import { errorDetails } from "./events"
import { generateImageAsset } from "./images/index"
import { optionalStringList, requiredString } from "./input"
import { type ModelToolCall } from "./model/types"
import { executeRunTool } from "./run"
import { recordToolResultActivity } from "./runs/activity"
import { executeCodingTool } from "./sandbox/coding"
import { prepareProviderToolInput } from "./sandbox/source"
import { type SandboxRuntime } from "./sandbox/types"
import { executeActiveSurfaceTool } from "./surface"
import { toolErrorResult, toolResult, toToolContent } from "./tool/results"
import { findTool, requireSurface, shouldFinishConvexTool } from "./tool/select"
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

export async function executeToolCall(
  args: ToolCallArgs
): Promise<ToolCallResult> {
  const tool = findTool(args.runtime.context.tools, args.call.name)
  // Recorded concurrently with the tool execution and joined before the
  // outcome trace, so the started trace always lands first and a failed
  // trace write still aborts the attempt.
  const startedPending = recordToolEvent(eventArgs(args), tool, "tool.started")
  const outcome = await runTool(args, tool)

  await startedPending

  return outcome.ok
    ? await recordToolSuccess(args, tool, outcome.result)
    : await recordToolFailure(args, tool, outcome.details)
}

type ToolCallArgs = {
  attempt: number
  call: ModelToolCall
  runtime: ToolRuntime
  sequence: number
}

type ToolCallOutcome =
  | { ok: true; result: Awaited<ReturnType<typeof executeTool>> }
  | { ok: false; details: ReturnType<typeof errorDetails> }

async function runTool(
  args: ToolCallArgs,
  tool: RuntimeTool
): Promise<ToolCallOutcome> {
  try {
    return {
      ok: true,
      result: await executeTool(args.runtime, tool, args.call),
    }
  } catch (error) {
    return { ok: false, details: errorDetails(error) }
  }
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
      content: toToolContent(result.value),
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
    content: toToolContent(toolErrorResult(details.error)),
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
      return toolResult(await executeAgentTool(runtime, call.args))
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

async function executeAgentTool(runtime: ToolRuntime, input: JsonObject) {
  return await runtime.convex.createAgentRun({
    parentId: runtime.context.run.id,
    task: requiredString(input.task, "task"),
    title: requiredString(input.title, "title"),
    tools: optionalStringList(input.tools),
  })
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
