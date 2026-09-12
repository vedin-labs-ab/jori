import {
  arrayProperty,
  booleanProperty,
  enumProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../common"
import { visibilitySchema } from "./visibility"

function jobRecordProperties() {
  return {
    _id: stringProperty("Job ID."),
    name: stringProperty("Job name."),
    instructions: stringProperty("Canonical Markdown instructions."),
    type: enumProperty(["once", "cron", "event"], "Job trigger kind."),
    status: enumProperty(
      ["active", "paused", "completed"],
      "Current job status."
    ),
    visibility: visibilitySchema(),
    principal: {
      description: "The identity each job run executes as.",
      oneOf: [
        objectSchema({
          required: ["kind", "personId"],
          properties: {
            kind: { const: "person" },
            personId: stringProperty("Execution person's ID."),
          },
        }),
        objectSchema({
          required: ["kind"],
          properties: { kind: { const: "organization" } },
        }),
      ],
    },
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
    required: [
      "_id",
      "name",
      "instructions",
      "type",
      "status",
      "visibility",
      "principal",
      "createdAt",
      "updatedAt",
    ],
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
