import {
  enumField,
  type JsonSchema,
  listField,
  nullableStringField,
  numberField,
  resultSchema,
  type SchemaMap,
  stringField,
} from "../common"

function runSummarySchema(): JsonSchema {
  return resultSchema({
    description: "Run summary; error appears only on failed runs.",
    required: ["runId", "title", "status", "startedAt", "endedAt"],
    properties: {
      runId: stringField("Run ID for search_run_activity and wait tools."),
      title: stringField("What the run is doing."),
      task: stringField("The task the run was started with."),
      trigger: stringField("What triggered the run."),
      scope: stringField("Audience scope of the run."),
      status: enumField(
        ["queued", "running", "completed", "failed", "stopped"],
        "Where the run is in its lifecycle."
      ),
      source: stringField("Surface or automation the run came from."),
      context: listField("Context labels for the run.", {
        type: "object",
        additionalProperties: true,
      }),
      error: stringField("Why the run failed, when it did."),
      startedAt: numberField("Start time in epoch milliseconds."),
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
      id: stringField("Activity entry ID."),
      kind: enumField(
        ["tool", "model", "approval", "asset", "agent"],
        "What kind of step this was."
      ),
      status: stringField(
        "Step status; failed entries match the error filter."
      ),
      title: stringField("Human-readable step title."),
      tool: stringField("Tool name for tool steps."),
      integration: stringField("Integration the step used, when one did."),
      startedAt: numberField("Start time in epoch milliseconds."),
      endedAt: numberField("End time in epoch milliseconds, once finished."),
      durationMs: numberField("Step duration."),
    },
  }
}

export const runMiloToolResponseSchemas = {
  search_runs: resultSchema({
    required: ["cursor", "runs"],
    properties: {
      cursor: nullableStringField(
        "Cursor for the next page; null when the listing is complete."
      ),
      runs: listField(
        "Visible runs matching the mode and filters.",
        runSummarySchema()
      ),
    },
  }),
  search_run_activity: resultSchema({
    required: ["cursor", "items"],
    properties: {
      cursor: nullableStringField(
        "Cursor for the next page; null when the listing is complete."
      ),
      items: listField(
        "Activity entries for the run, oldest first.",
        activityItemSchema()
      ),
    },
  }),
} satisfies SchemaMap
