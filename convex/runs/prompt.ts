import { promptTemplates, type SkillId, skills } from "../prompts/generated"
import { type CodexRuntimeInput } from "./codex"

export type PromptBundle = {
  rendered: string
  parts: PromptPart[]
  skillIds: SkillId[]
}

type PromptPart = {
  id: string
  type: "skill" | "runtime"
  content: string
}

export function assemblePrompt(input: CodexRuntimeInput): PromptBundle {
  const skillIds = selectSkillIds(input)
  const parts = [
    ...skillIds.map((skillId) => createSkillPart(skillId)),
    createSlackRuntimePart(input),
  ]

  return {
    rendered: parts.map((part) => part.content).join("\n\n"),
    parts,
    skillIds,
  }
}

function selectSkillIds(input: CodexRuntimeInput) {
  const skillIds: SkillId[] = ["milo-persona"]

  if (input.integration.provider === "slack") {
    skillIds.push("slack-communication")
  }

  return skillIds
}

function createSkillPart(skillId: SkillId): PromptPart {
  const skill = skills[skillId]

  return {
    id: skillId,
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
