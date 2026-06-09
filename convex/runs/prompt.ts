import { promptTemplates } from "../prompts/generated"
import { type CodexRuntimeInput } from "./codex"

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
  availableSkills: RuntimeSkill[]
): PromptBundle {
  const parts = [
    createSystemPart(),
    ...availableSkills.map((skill) => createSkillPart(skill)),
    createTriggerPart(input),
  ]

  return {
    rendered: parts.map((part) => part.content).join("\n\n"),
    parts,
    skillIds: availableSkills.map((skill) => skill.name),
  }
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

function getProviderLabel(
  provider: "github" | "linear" | "microsoft" | "slack"
) {
  if (provider === "github") {
    return "GitHub"
  }

  if (provider === "linear") {
    return "Linear"
  }

  if (provider === "microsoft") {
    return "Microsoft Teams"
  }

  return "Slack"
}

function getMessageTargetId(
  provider: "github" | "linear" | "microsoft" | "slack",
  data: unknown
) {
  if (provider === "github") {
    return getGitHubTargetId(data)
  }

  if (provider === "linear") {
    return getDataString(data, "issueId") ?? ""
  }

  if (provider === "microsoft") {
    return (
      getDataString(data, "chatId") ??
      getDataString(data, "channelId") ??
      getDataString(data, "resource") ??
      ""
    )
  }

  return getDataString(data, "channelId") ?? ""
}

function getGitHubTargetId(data: unknown) {
  const repository = getDataObject(data, "repository")
  const fullName = getDataString(repository, "fullName")
  const issueNumber = getDataNumber(data, "issueNumber")
  const pullNumber = getDataNumber(data, "pullNumber")
  const number = pullNumber ?? issueNumber

  if (fullName === undefined || number === undefined) {
    return ""
  }

  return `${fullName}#${number}`
}

function getDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}

function getDataNumber(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "number" ? value : undefined
}

function getDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
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
