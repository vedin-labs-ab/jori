import { automationEventCatalog } from "../../../automations/events"
import { numberProperty, objectSchema, stringProperty } from "./common"

const providerEnum = [
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
const eventProviderEnum = automationEventCatalog.map(
  (definition) => definition.provider
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
    required: ["read", "write", "web"],
    properties: {
      read: {
        oneOf: [
          {
            const: "all",
            description: "Allow reads from every connected integration.",
          },
          {
            type: "array",
            description: "Providers this automation may read from.",
            items: {
              type: "string",
              enum: providerEnum,
            },
          },
        ],
      },
      write: {
        type: "array",
        description:
          "Providers this automation may write to. At least one is required.",
        items: {
          type: "string",
          enum: providerEnum,
        },
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
      required: ["type", "provider", "event"],
      properties: {
        type: { const: "event" },
        provider: {
          type: "string",
          enum: eventProviderEnum,
          description: "Connected provider that emits the event.",
        },
        event: {
          type: "string",
          enum: eventEnum,
          description: "Supported event name for the selected provider.",
        },
        filter: stringProperty(
          "Exact resource value when the event requires one, such as a Slack channel ID or Notion page ID."
        ),
      },
    }),
  ],
})

export const miloToolInputSchemas = {
  save_artifact: objectSchema({
    required: ["path"],
    properties: {
      path: stringProperty(
        "Local file path to persist. Use this before sharing or attaching generated files."
      ),
      name: stringProperty("Optional filename to show to recipients."),
      mimeType: stringProperty(
        "Optional content type, for example image/png or application/pdf."
      ),
      description: stringProperty(
        "Optional short description of the artifact."
      ),
    },
  }),
  search_artifacts: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against artifact names, descriptions, and content types."
      ),
      mimeType: stringProperty(
        "Optional content type filter, for example image/png or image/."
      ),
      limit: numberProperty("Maximum artifacts to return.", 1, 100),
    },
  }),
  read_artifact: objectSchema({
    required: ["artifactId"],
    properties: {
      artifactId: stringProperty("Artifact ID."),
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
