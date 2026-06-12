import { numberProperty, objectSchema, stringProperty } from "./common"

const scheduleOutputSchema = () => ({
  ...objectSchema({
    required: ["readScope", "webSearch", "surfaces"],
    properties: {
      readScope: {
        type: "string",
        enum: ["selected", "allConnected"],
        description:
          "Use selected to limit reads to listed read/both surfaces. Use allConnected to allow reads from every connected integration.",
      },
      webSearch: {
        type: "boolean",
        description:
          "Whether this schedule may use hosted web search during runs.",
      },
      surfaces: {
        type: "array",
        description:
          "Integration access for this schedule. At least one surface must be write or both.",
        items: objectSchema({
          required: ["provider", "access"],
          properties: {
            provider: {
              type: "string",
              enum: [
                "slack",
                "linear",
                "github",
                "gmail",
                "googleCalendar",
                "googleDrive",
                "notion",
                "microsoftEmail",
                "microsoftCalendar",
              ],
              description: "Connected integration provider.",
            },
            access: {
              type: "string",
              enum: ["read", "write", "both"],
              description:
                "Read exposes read tools, write exposes write tools, both exposes both.",
            },
          },
        }),
      },
    },
  }),
  description: "Integration read/write access for each scheduled run.",
})

const scheduleSchema = () => ({
  description: "When to run.",
  oneOf: [
    objectSchema({
      required: ["type", "runAt"],
      properties: {
        type: { const: "oneShot" },
        runAt: stringProperty("Future ISO timestamp in UTC, ending with Z."),
      },
    }),
    objectSchema({
      required: ["type", "cron"],
      properties: {
        type: { const: "recurring" },
        cron: stringProperty("Five-field cron expression interpreted in UTC."),
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
  add_schedule: objectSchema({
    required: ["name", "description", "schedule", "output"],
    properties: {
      name: stringProperty("Short schedule name."),
      description: stringProperty(
        "What each run should do, written as instructions for the agent that executes it."
      ),
      metadata: {
        description: "Optional JSON context made available to every run.",
      },
      schedule: scheduleSchema(),
      output: scheduleOutputSchema(),
    },
  }),
  search_schedules: objectSchema({
    properties: {
      query: stringProperty(
        "Substring matched against schedule names and descriptions."
      ),
      includeCompleted: {
        type: "boolean",
        description: "Also return completed schedules.",
      },
      limit: numberProperty("Maximum number of schedules to return."),
    },
  }),
  read_schedule: objectSchema({
    required: ["scheduleId"],
    properties: {
      scheduleId: stringProperty("Milo schedule ID."),
    },
  }),
  update_schedule: objectSchema({
    required: ["scheduleId"],
    properties: {
      scheduleId: stringProperty("Milo schedule ID."),
      name: stringProperty("Updated schedule name."),
      description: stringProperty("Updated run instructions."),
      metadata: {
        description: "Optional JSON context made available to every run.",
      },
      schedule: scheduleSchema(),
      output: scheduleOutputSchema(),
    },
  }),
  delete_schedule: objectSchema({
    required: ["scheduleId"],
    properties: {
      scheduleId: stringProperty("Milo schedule ID."),
    },
  }),
}
