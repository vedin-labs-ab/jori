import { numberProperty, objectSchema, stringProperty } from "./common"

const slackOutputSchema = () => ({
  ...objectSchema({
    required: ["type", "channelId"],
    properties: {
      type: { const: "slack" },
      channelId: stringProperty("Slack channel ID."),
      threadId: stringProperty("Slack thread timestamp."),
    },
  }),
  description: "Slack target where each run publishes its result.",
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
      output: slackOutputSchema(),
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
      output: slackOutputSchema(),
    },
  }),
  delete_schedule: objectSchema({
    required: ["scheduleId"],
    properties: {
      scheduleId: stringProperty("Milo schedule ID."),
    },
  }),
}
