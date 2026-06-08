import { promptTemplates } from "../prompts/generated"
import { type CodexRuntimeInput } from "./codex"

export type PromptBundle = {
  rendered: string
  parts: PromptPart[]
  skillIds: string[]
}

type PromptPart = {
  id: string
  type: "skill" | "runtime"
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
    ...availableSkills.map((skill) => createSkillPart(skill)),
    createSlackRuntimePart(input),
  ]

  return {
    rendered: parts.map((part) => part.content).join("\n\n"),
    parts,
    skillIds: availableSkills.map((skill) => skill.name),
  }
}

function createSkillPart(skill: RuntimeSkill): PromptPart {
  return {
    id: skill.id,
    type: "skill",
    content: [`# Skill: ${skill.name}`, "", skill.body].join("\n"),
  }
}

function createSlackRuntimePart(input: CodexRuntimeInput): PromptPart {
  return {
    id: "runtime/slack-message",
    type: "runtime",
    content: renderTemplate(promptTemplates["runtime/slack-message"], {
      message: {
        channelId: input.message.containerId ?? "",
        threadId: input.message.threadId ?? input.message.providerId,
        text: input.message.text ?? "",
      },
    }),
  }
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
