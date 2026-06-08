import { promptTemplates } from "../prompts/generated"
import { type CodexRuntimeInput } from "./codex"

export type PromptBundle = {
  rendered: string
  parts: PromptPart[]
  skillIds: string[]
}

type PromptPart = {
  id: string
  type: "system" | "skill" | "runtime"
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
    createRuntimePart(input),
  ]

  return {
    rendered: parts.map((part) => part.content).join("\n\n"),
    parts,
    skillIds: availableSkills.map((skill) => skill.name),
  }
}

function createSystemPart(): PromptPart {
  return {
    id: "system/milo",
    type: "system",
    content: promptTemplates["system/milo"],
  }
}

function createSkillPart(skill: RuntimeSkill): PromptPart {
  return {
    id: skill.id,
    type: "skill",
    content: [`# Skill: ${skill.name}`, "", skill.body].join("\n"),
  }
}

function createRuntimePart(input: CodexRuntimeInput): PromptPart {
  if (input.type === "scheduled") {
    return createScheduledRuntimePart(input)
  }

  return createSlackRuntimePart(input)
}

function createSlackRuntimePart(
  input: Extract<CodexRuntimeInput, { type: "slack" }>
): PromptPart {
  return {
    id: "communication/slack",
    type: "runtime",
    content: renderTemplate(promptTemplates["communication/slack"], {
      message: {
        channelId: getSlackChannelId(input.message.data) ?? "",
        conversationId:
          input.message.conversationId ?? input.message.externalId,
        text: input.message.text ?? "",
      },
    }),
  }
}

function createScheduledRuntimePart(
  input: Extract<CodexRuntimeInput, { type: "scheduled" }>
): PromptPart {
  return {
    id: "runtime/scheduled-task",
    type: "runtime",
    content: renderTemplate(promptTemplates["runtime/scheduled-task"], {
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

function getSlackChannelId(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>).channelId

  return typeof value === "string" ? value : undefined
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
