import { automationEventCatalog } from "../../../../../../contracts/automations/events"
import { integrations as integrationEnum } from "../../../../../shared/integrations"
import {
  numberProperty,
  objectProperty,
  objectSchema,
  stringProperty,
} from "../fragments/common"

const automationInstructionsDescription =
  "Canonical Markdown instructions for each run. Use @Integration for every integration whose access is granted, /skill for skills, and #tool for tools. Use txt fences for plain-text examples that should keep Jori references active; language-tagged code fences are literal. Keep the explicit access payload aligned with every referenced integration tool."

const eventIntegrationEnum = automationEventCatalog.map(
  (definition) => definition.integration
)
const eventEnum = [
  ...new Set(
    automationEventCatalog.flatMap((definition) =>
      definition.events.map((event) => event.value)
    )
  ),
]

const accessSchema = () => ({
  ...objectSchema({
    required: ["integrations", "web"],
    properties: {
      integrations: {
        type: "array",
        description:
          "Integration tools this automation may use. Select exact tool names from the permission catalog.",
        items: objectSchema({
          required: ["integration", "tools"],
          properties: {
            integration: {
              type: "string",
              enum: integrationEnum,
              description: "Connected integration.",
            },
            tools: {
              type: "array",
              description:
                "Exact tool names this automation may use for this integration.",
              items: { type: "string" },
            },
          },
        }),
      },
      web: {
        type: "boolean",
        description: "Whether this automation may use hosted web search.",
      },
    },
  }),
  description: "Integration and web access for each automation run.",
})

const visibilityProperty = {
  type: "string",
  enum: ["private", "organization"],
  description:
    "Who this automation is for. private: only the requester can see and manage it, and its runs stay theirs. organization: every member can see and manage it, and its runs are visible to the whole organization. Omit to default from the tools: anything touching the requester's own email or calendar stays private; pure workspace-tool automations become organization.",
}

const triggerSchema = () => ({
  description:
    "Type-specific trigger payload. Pair with the top-level automation type.",
  oneOf: [
    objectSchema({
      required: ["at"],
      properties: {
        at: stringProperty("Future ISO timestamp in UTC, ending with Z."),
      },
    }),
    objectSchema({
      required: ["expression", "timezone"],
      properties: {
        expression: stringProperty(
          "Five-field cron expression interpreted in the supplied timezone."
        ),
        timezone: stringProperty("IANA timezone for the cron expression."),
      },
    }),
    objectSchema({
      required: ["integration", "event"],
      properties: {
        integration: {
          type: "string",
          enum: eventIntegrationEnum,
          description: "Connected integration that emits the event.",
        },
        event: {
          type: "string",
          description: "Supported event name for the selected integration.",
          enum: eventEnum,
        },
        match: objectProperty(
          'Normalized event match keyed by catalog parameter name, such as {"channel":"C123"} or {"repo":"owner/repo","issue":"123"}.'
        ),
      },
    }),
  ],
})

export const automationJoriToolInputSchemas = {
  add_automation: objectSchema({
    required: ["name", "instructions", "type", "trigger", "access"],
    properties: {
      key: stringProperty(
        "Optional stable idempotency key. Reusing it for the same owner returns the existing equivalent automation and rejects conflicting configuration."
      ),
      name: stringProperty("Short automation name."),
      instructions: stringProperty(automationInstructionsDescription),
      visibility: visibilityProperty,
      type: {
        type: "string",
        enum: ["once", "cron", "event"],
        description: "Automation trigger kind.",
      },
      trigger: triggerSchema(),
      access: accessSchema(),
    },
  }),
  search_automations: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against automation names and instructions."
      ),
      includeCompleted: {
        type: "boolean",
        description: "Also return completed automations.",
      },
      limit: numberProperty("Maximum number of automations to return."),
    },
  }),
  read_automation: objectSchema({
    required: ["automationId"],
    properties: {
      automationId: stringProperty("Jori automation ID."),
    },
  }),
  update_automation: objectSchema({
    required: ["automationId"],
    properties: {
      automationId: stringProperty("Jori automation ID."),
      name: stringProperty("Updated automation name."),
      instructions: stringProperty(automationInstructionsDescription),
      visibility: visibilityProperty,
      type: {
        type: "string",
        enum: ["once", "cron", "event"],
        description:
          "New automation trigger kind. Include a matching trigger when changing type.",
      },
      trigger: triggerSchema(),
      access: accessSchema(),
    },
  }),
  delete_automation: objectSchema({
    required: ["automationId"],
    properties: {
      automationId: stringProperty("Jori automation ID."),
    },
  }),
}
