import { type ToolPermission } from "../permissions/catalog"
import { promptTemplates } from "../prompts/generated"
import { renderPromptTemplate } from "../prompts/render"
import { type CodexRuntimeInput, type MessageProvider } from "./codex"
import {
  type ApprovalContinuation,
  createApprovalContinuationPrompt,
} from "./continuation"
import { readDataNumber, readDataObject, readDataString } from "./data"
import { createToolApprovalInstructions } from "./instructions"

export function assemblePrompt(
  input: CodexRuntimeInput,
  promptedTools: ToolPermission[] = [],
  continuation?: ApprovalContinuation
): string {
  const parts = [
    promptTemplates["system/persona"],
    ...(promptedTools.length === 0
      ? []
      : [createToolApprovalInstructions(promptedTools)]),
    createTriggerPart(input, continuation === undefined),
    ...(continuation === undefined
      ? []
      : [createApprovalContinuationPrompt(continuation)]),
  ]

  return parts.join("\n\n")
}

function createTriggerPart(input: CodexRuntimeInput, isInitialRun: boolean) {
  if (input.type === "scheduled") {
    return renderPromptTemplate(
      isInitialRun
        ? promptTemplates["trigger/schedule"]
        : promptTemplates["reference/schedule"],
      createScheduleValues(input)
    )
  }

  return renderPromptTemplate(
    isInitialRun
      ? promptTemplates["trigger/message"]
      : promptTemplates["reference/message"],
    createMessageValues(input)
  )
}

function createMessageValues(
  input: Extract<CodexRuntimeInput, { type: "message" }>
) {
  return {
    message: {
      provider: getProviderLabel(input.provider),
      target: getMessageTarget(input.provider, input.message.data),
      text: input.message.text ?? "",
    },
  }
}

function createScheduleValues(
  input: Extract<CodexRuntimeInput, { type: "scheduled" }>
) {
  return {
    output: {
      channelId: input.schedule.output.channelId,
      threadId: input.schedule.output.threadId ?? "",
    },
    schedule: {
      id: input.schedule._id,
      name: input.schedule.name,
      description: input.schedule.description,
      metadata: JSON.stringify(input.schedule.metadata ?? null),
    },
  }
}

const providerLabels = {
  github: "GitHub",
  linear: "Linear",
  slack: "Slack",
} satisfies Record<MessageProvider, string>

function getProviderLabel(provider: MessageProvider) {
  return providerLabels[provider]
}

function getMessageTarget(provider: MessageProvider, data: unknown) {
  if (provider === "github") {
    return formatTargetLines(getGitHubTargetLines(data))
  }

  if (provider === "linear") {
    return formatTargetLines(getLinearTargetLines(data))
  }

  return formatTargetLines(getSlackTargetLines(data))
}

function getGitHubTargetLines(data: unknown) {
  const repository = readDataObject(data, "repository")
  const comment = readDataObject(data, "comment")

  return [
    targetLine("Repository", readDataString(repository, "fullName")),
    targetLine("Issue number", readDataNumber(data, "issueNumber")),
    targetLine("Pull request number", readDataNumber(data, "pullNumber")),
    targetLine("Comment ID", readDataString(comment, "id")),
    targetLine("Comment kind", readDataString(comment, "kind")),
  ]
}

function getLinearTargetLines(data: unknown) {
  return [
    targetLine("Issue ID", readDataString(data, "issueId")),
    targetLine("Comment ID", readDataString(data, "commentId")),
  ]
}

function getSlackTargetLines(data: unknown) {
  return [
    targetLine("Channel ID", readDataString(data, "channelId")),
    targetLine("Message timestamp", readDataString(data, "ts")),
    targetLine("Thread timestamp", readDataString(data, "threadTs")),
  ]
}

function targetLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") {
    return null
  }

  return `- ${label}: ${value}`
}

function formatTargetLines(lines: Array<string | null>) {
  const present = lines.filter((line) => line !== null)

  return present.length === 0 ? "- None" : present.join("\n")
}
