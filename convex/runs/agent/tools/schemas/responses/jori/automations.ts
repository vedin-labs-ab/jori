import {
  arrayProperty,
  booleanProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../common"

function automationRecordProperties() {
  return {
    _id: stringProperty("Automation ID."),
    name: stringProperty("Automation name."),
    instructions: stringProperty("Canonical Markdown instructions."),
    type: stringProperty("recurring, once, or mention."),
    status: stringProperty("active, paused, or completed."),
    audience: stringProperty("personal or organization."),
    createdAt: numberProperty("Creation time in epoch milliseconds."),
    updatedAt: numberProperty("Last update time in epoch milliseconds."),
  }
}

function automationRecord(
  description: string,
  extra: Record<string, unknown> = {}
): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
    properties: { ...automationRecordProperties(), ...extra },
  }
}

export const automationJoriToolResponseSchemas = {
  add_job: automationRecord(
    "The automation record. An existing automation with the same key and identical configuration is returned instead of a duplicate.",
    {
      created: booleanProperty(
        "True when a new automation was created; false when the key already existed."
      ),
    }
  ),
  search_jobs: arrayProperty(
    "Visible automations matching the query.",
    automationRecord("Automation record with trigger and access.")
  ),
  read_job: {
    ...automationRecord(
      "The automation record with trigger and access; null when not found."
    ),
    type: ["object", "null"],
  },
  update_job: automationRecord("The automation record after the update."),
  delete_job: objectSchema({
    required: ["deleted", "automationId"],
    properties: {
      deleted: { type: "boolean", const: true },
      automationId: stringProperty("The removed automation's ID."),
    },
  }),
} satisfies SchemaMap
