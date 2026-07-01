import { automationEventCatalog } from "../../../../../automations/events"
import { integrations as integrationEnum } from "../../../../../shared/integrations"
import {
  numberProperty,
  objectProperty,
  objectSchema,
  stringProperty,
} from "../common"

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
  enum: ["private", "public"],
  description:
    "Who can discover runs from this automation. Omit or use private unless the requester explicitly wants tenant-visible run history.",
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
      required: ["expression"],
      properties: {
        expression: stringProperty(
          "Five-field cron expression interpreted in UTC."
        ),
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

export const automationMiloToolInputSchemas = {
  add_automation: objectSchema({
    required: ["name", "instructions", "type", "trigger", "access"],
    properties: {
      artifactId: stringProperty(
        "Optional artifact ID. Use this for artifact-owned automations that write artifact state."
      ),
      name: stringProperty("Short automation name."),
      instructions: stringProperty(
        "What each run should do, written as instructions for the agent that executes it."
      ),
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
      automationId: stringProperty("Milo automation ID."),
    },
  }),
  update_automation: objectSchema({
    required: ["automationId"],
    properties: {
      automationId: stringProperty("Milo automation ID."),
      artifactId: stringProperty(
        "Optional artifact ID. Set this when binding the automation to an artifact."
      ),
      name: stringProperty("Updated automation name."),
      instructions: stringProperty("Updated run instructions."),
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
      automationId: stringProperty("Milo automation ID."),
    },
  }),
}
