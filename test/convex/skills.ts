import { type RuntimeSkill } from "../../convex/skills/runtime"

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
      name: "app-creator",
      description: "Create or update Jori apps.",
      body: "# App Creator\n\nUse this skill for app work.",
    }),
    runtimeSkill({
      name: "frontend-design",
      description: "Design Jori-native app and frontend UI.",
      body: "# Frontend Design\n\nDesign the useful surface first.",
    }),
    runtimeSkill({
      name: "image-generation",
      description: "Generate Jori image assets.",
      body: "# Image Generation\n\nCall `generate_image` for images.",
    }),
    runtimeSkill({
      name: "slack",
      category: "communication",
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
    organizationId: null,
    category: "creation",
    associatedIntegrations: [],
    ...skill,
  }
}
