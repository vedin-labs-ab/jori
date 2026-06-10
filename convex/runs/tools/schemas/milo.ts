import { numberProperty, objectSchema, stringProperty } from "./common"

const slackOutputSchema = () =>
  objectSchema({
    required: ["type", "channelId"],
    properties: {
      type: { const: "slack" },
      channelId: stringProperty("Slack channel ID."),
      threadId: stringProperty("Slack thread timestamp."),
    },
  })

const scheduleSchema = () => ({
  oneOf: [
    objectSchema({
      required: ["type", "runAt"],
      properties: {
        type: { const: "oneShot" },
        runAt: stringProperty("ISO timestamp in UTC, ending with Z."),
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
      name: stringProperty("Schedule name."),
      description: stringProperty("Schedule description."),
      metadata: {},
      schedule: scheduleSchema(),
      output: slackOutputSchema(),
    },
  }),
  search_schedules: objectSchema({
    properties: {
      query: stringProperty("Search query."),
      includeCompleted: { type: "boolean" },
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
      description: stringProperty("Updated schedule description."),
      metadata: {},
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
