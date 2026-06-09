import { type ToolPermission } from "../permissions/catalog"
import { promptTemplates } from "../prompts/generated"
import { type CodexRuntimeInput, type MessageProvider } from "./codex"
import { readDataNumber, readDataObject, readDataString } from "./data"

export type PromptBundle = {
  rendered: string
  parts: PromptPart[]
  skillIds: string[]
}

type PromptPart = {
  id: string
  type: "system" | "skill" | "trigger"
  content: string
}

export type RuntimeSkill = {
  id: string
  tenantId: string | null
  name: string
  description: string
  body: string
}

export function assemblePrompt(
  input: CodexRuntimeInput,
  availableSkills: RuntimeSkill[],
  promptedTools: ToolPermission[] = []
): PromptBundle {
  const parts = [
    createSystemPart(),
    ...createApprovalParts(promptedTools),
    ...availableSkills.map((skill) => createSkillPart(skill)),
    createTriggerPart(input),
  ]

  return {
    rendered: parts.map((part) => part.content).join("\n\n"),
    parts,
    skillIds: availableSkills.map((skill) => skill.name),
  }
}

function createApprovalParts(promptedTools: ToolPermission[]): PromptPart[] {
  if (promptedTools.length === 0) {
    return []
  }

  return [
    {
      id: "system/tool-approval",
      type: "system",
      content: [
        "# Tool Approval",
        "",
        "The following tools require explicit user approval before use:",
        "",
        ...promptedTools.map((tool) => `- ${tool.tool}: ${tool.description}`),
        "",
        "When you need one of these tools, describe the exact action you want to take, ask for approval, and stop. Do not call the tool in the same turn.",
        "If the current user message clearly approves a previously requested action, call only the approved tool with the approved arguments.",
      ].join("\n"),
    },
  ]
}

function createSystemPart(): PromptPart {
  return {
    id: "system/persona",
    type: "system",
    content: promptTemplates["system/persona"],
  }
}

function createSkillPart(skill: RuntimeSkill): PromptPart {
  return {
    id: skill.id,
    type: "skill",
    content: [`# Skill: ${skill.name}`, "", skill.body].join("\n"),
  }
}

function createTriggerPart(input: CodexRuntimeInput): PromptPart {
  if (input.type === "scheduled") {
    return createScheduledTriggerPart(input)
  }

  return createMessageTriggerPart(input)
}

function createMessageTriggerPart(
  input: Extract<CodexRuntimeInput, { type: "message" }>
): PromptPart {
  return {
    id: "trigger/message",
    type: "trigger",
    content: renderTemplate(promptTemplates["trigger/message"], {
      message: {
        provider: getProviderLabel(input.provider),
        targetId: getMessageTargetId(input.provider, input.message.data),
        conversationId:
          input.message.conversationId ?? input.message.externalId,
        text: input.message.text ?? "",
      },
    }),
  }
}

function createScheduledTriggerPart(
  input: Extract<CodexRuntimeInput, { type: "scheduled" }>
): PromptPart {
  return {
    id: "trigger/schedule",
    type: "trigger",
    content: renderTemplate(promptTemplates["trigger/schedule"], {
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
    }),
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

function getMessageTargetId(provider: MessageProvider, data: unknown) {
  if (provider === "github") {
    return getGitHubTargetId(data)
  }

  if (provider === "linear") {
    return readDataString(data, "issueId") ?? ""
  }

  return readDataString(data, "channelId") ?? ""
}

function getGitHubTargetId(data: unknown) {
  const repository = readDataObject(data, "repository")
  const fullName = readDataString(repository, "fullName")
  const issueNumber = readDataNumber(data, "issueNumber")
  const pullNumber = readDataNumber(data, "pullNumber")
  const number = pullNumber ?? issueNumber

  if (fullName === undefined || number === undefined) {
    return ""
  }

  return `${fullName}#${number}`
}

function renderTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replaceAll(/{{\s*([\w.]+)\s*}}/g, (_match, path) =>
    String(resolveTemplateValue(values, path))
  )
}

function resolveTemplateValue(values: Record<string, unknown>, path: string) {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null || !(part in current)) {
      throw new Error(`Missing prompt template value: ${path}`)
    }

    return current[part as keyof typeof current]
  }, values)

  if (value === undefined || value === null) {
    throw new Error(`Missing prompt template value: ${path}`)
  }

  return value
}
