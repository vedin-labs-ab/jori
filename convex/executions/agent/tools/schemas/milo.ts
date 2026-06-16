import { automationEventCatalog } from "../../../../automations/events"
import {
  numberProperty,
  objectProperty,
  objectSchema,
  stringProperty,
} from "./common"

const integrationEnum = [
  "slack",
  "linear",
  "github",
  "gmail",
  "googleCalendar",
  "googleDrive",
  "notion",
  "microsoftEmail",
  "microsoftCalendar",
]
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

const triggerSchema = () => ({
  description: "What starts the automation.",
  oneOf: [
    objectSchema({
      required: ["type", "at"],
      properties: {
        type: { const: "once" },
        at: stringProperty("Future ISO timestamp in UTC, ending with Z."),
      },
    }),
    objectSchema({
      required: ["type", "cron"],
      properties: {
        type: { const: "cron" },
        cron: stringProperty("Five-field cron expression interpreted in UTC."),
      },
    }),
    objectSchema({
      required: ["type", "integration", "event"],
      properties: {
        type: { const: "event" },
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
        criteria: objectProperty(
          'Normalized event criteria keyed by catalog parameter name, such as {"channel":"C123"} or {"repo":"owner/repo","issue":"123"}.'
        ),
      },
    }),
  ],
})

export const miloToolInputSchemas = {
  save_file: objectSchema({
    required: ["path"],
    properties: {
      path: stringProperty(
        "Local file path to persist. Use this before sharing or attaching generated files."
      ),
      name: stringProperty("Optional filename to show to recipients."),
      mimeType: stringProperty(
        "Optional content type, for example image/png or application/pdf."
      ),
      description: stringProperty("Optional short description of the file."),
    },
  }),
  search_files: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against file names, descriptions, and content types."
      ),
      mimeType: stringProperty(
        "Optional content type filter, for example image/png or image/."
      ),
      limit: numberProperty("Maximum files to return.", 1, 100),
    },
  }),
  read_file: objectSchema({
    required: ["fileId"],
    properties: {
      fileId: stringProperty("File ID."),
    },
  }),
  add_automation: objectSchema({
    required: ["name", "instructions", "trigger", "access"],
    properties: {
      name: stringProperty("Short automation name."),
      instructions: stringProperty(
        "What each run should do, written as instructions for the agent that executes it."
      ),
      metadata: {
        description: "Optional JSON context made available to every run.",
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
      name: stringProperty("Updated automation name."),
      instructions: stringProperty("Updated run instructions."),
      metadata: {
        description: "Optional JSON context made available to every run.",
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
