import {
  arrayProperty,
  enumProperty,
  type JsonSchema,
  nullableStringProperty,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../common"

function runSummarySchema(): JsonSchema {
  return objectSchema({
    description: "Run summary; error appears only on failed runs.",
    required: ["runId", "title", "status", "startedAt", "endedAt"],
    properties: {
      runId: stringProperty("Run ID for search_run_activity and wait tools."),
      title: stringProperty("What the run is doing."),
      task: stringProperty("The task the run was started with."),
      trigger: stringProperty("What triggered the run."),
      scope: stringProperty("Audience scope of the run."),
      status: enumProperty(
        ["queued", "running", "completed", "failed", "stopped"],
        "Where the run is in its lifecycle."
      ),
      source: stringProperty("Surface or automation the run came from."),
      context: arrayProperty("Context labels for the run.", {
        type: "object",
        additionalProperties: true,
      }),
      error: stringProperty("Why the run failed, when it did."),
      startedAt: numberProperty("Start time in epoch milliseconds."),
      endedAt: {
        type: ["number", "null"],
        description: "End time in epoch milliseconds; null while running.",
      },
    },
  })
}

function activityItemSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description:
      "One activity entry with kind-specific detail fields alongside the core ones.",
    properties: {
      id: stringProperty("Activity entry ID."),
      kind: enumProperty(
        ["tool", "model", "approval", "asset", "agent"],
        "What kind of step this was."
      ),
      status: stringProperty(
        "Step status; failed entries match the error filter."
      ),
      title: stringProperty("Human-readable step title."),
      tool: stringProperty("Tool name for tool steps."),
      integration: stringProperty("Integration the step used, when one did."),
      startedAt: numberProperty("Start time in epoch milliseconds."),
      endedAt: numberProperty("End time in epoch milliseconds, once finished."),
      durationMs: numberProperty("Step duration."),
    },
  }
}

export const runMiloToolResponseSchemas = {
  search_runs: objectSchema({
    required: ["cursor", "runs"],
    properties: {
      cursor: nullableStringProperty(
        "Cursor for the next page; null when the listing is complete."
      ),
      runs: arrayProperty(
        "Visible runs matching the mode and filters.",
        runSummarySchema()
      ),
    },
  }),
  search_run_activity: objectSchema({
    required: ["cursor", "items"],
    properties: {
      cursor: nullableStringProperty(
        "Cursor for the next page; null when the listing is complete."
      ),
      items: arrayProperty(
        "Activity entries for the run, oldest first.",
        activityItemSchema()
      ),
    },
  }),
} satisfies SchemaMap
