import { type RuntimeSkill } from "../../../skills/runtime"

const slackTextGuidance =
  "Most replies are a line or two of plain `mrkdwn`. Reach for structure only when it earns its place.\n\n" +
  "Format Slack messages with Slack `mrkdwn`, NOT GitHub Markdown.\n\n" +
  "Escape literal `&`, `<`, and `>` unless they are part of valid Slack syntax."

const slackRichGuidance =
  "Use Slack `blocks` when structure makes the message easier to scan.\n\n" +
  "Never use interactive Slack surfaces or controls. Callbacks are not handled."

export function runtimeSkills(
  extraSkills: readonly RuntimeSkill[] = []
): RuntimeSkill[] {
  return [
    runtimeSkill({
      name: "artifact-creator",
      description: "Create or update Milo artifacts.",
      body: "# Artifact Creator\n\nUse this skill for artifact work.",
    }),
    runtimeSkill({
      name: "frontend-design",
      description: "Design Milo-native artifact and frontend UI.",
      body: "# Frontend Design\n\nDesign the useful surface first.",
    }),
    runtimeSkill({
      name: "image-generation",
      description: "Generate Milo image assets.",
      body: "# Image Generation\n\nCall `generate_image` for images.",
    }),
    runtimeSkill({
      name: "slack",
      category: "Communication",
      description: "Format Slack replies.",
      associatedIntegrations: ["slack"],
      communication: {
        parts: {
          text: slackTextGuidance,
          rich: slackRichGuidance,
        },
      },
      body: [
        "## Text",
        "Format Slack messages with Slack `mrkdwn`, NOT GitHub Markdown.",
        "## Rich",
        "Use Slack `blocks` when structure makes the message easier to scan.",
      ].join("\n\n"),
    }),
    ...extraSkills,
  ]
}

export function runtimeSkill(
  skill: Partial<RuntimeSkill> &
    Pick<RuntimeSkill, "body" | "description" | "name">
): RuntimeSkill {
  return {
    tenantId: null,
    category: "Milo",
    associatedIntegrations: [],
    ...skill,
  }
}
