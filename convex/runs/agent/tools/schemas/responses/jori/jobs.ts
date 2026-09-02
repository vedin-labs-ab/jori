import {
  arrayProperty,
  booleanProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../common"

function jobRecordProperties() {
  return {
    _id: stringProperty("Job ID."),
    name: stringProperty("Job name."),
    instructions: stringProperty("Canonical Markdown instructions."),
    type: stringProperty("recurring, once, or mention."),
    status: stringProperty("active, paused, or completed."),
    audience: stringProperty("personal or organization."),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    updatedAt: numberProperty("Last update time in epoch milliseconds."),
  }
}

function jobRecord(
  description: string,
  extra: Record<string, unknown> = {}
): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
    properties: { ...jobRecordProperties(), ...extra },
  }
}

export const jobJoriToolResponseSchemas = {
  add_job: jobRecord(
    "The job record. An existing job with the same key and identical configuration is returned instead of a duplicate.",
    {
      created: booleanProperty(
        "True when a new job was created; false when the key already existed."
      ),
    }
  ),
  search_jobs: arrayProperty(
    "Visible jobs matching the query.",
    jobRecord("Job record with trigger and access.")
  ),
  read_job: {
    ...jobRecord(
      "The job record with trigger and access; null when not found."
    ),
    type: ["object", "null"],
  },
  update_job: jobRecord("The job record after the update."),
  delete_job: objectSchema({
    required: ["deleted", "jobId"],
    properties: {
      deleted: { type: "boolean", const: true },
      jobId: stringProperty("The removed job's ID."),
    },
  }),
} satisfies SchemaMap
