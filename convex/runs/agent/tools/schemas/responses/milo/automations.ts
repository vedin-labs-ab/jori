import {
  booleanField,
  type JsonSchema,
  listField,
  numberField,
  resultSchema,
  type SchemaMap,
  stringField,
} from "../common"

function automationRecordProperties() {
  return {
    _id: stringField("Automation ID."),
    name: stringField("Automation name."),
    instructions: stringField("Canonical Markdown instructions."),
    type: stringField("recurring, once, or mention."),
    status: stringField("active, paused, or completed."),
    scope: stringField("personal or organization."),
    createdAt: numberField("Creation time in epoch milliseconds."),
    updatedAt: numberField("Last update time in epoch milliseconds."),
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

export const automationMiloToolResponseSchemas = {
  add_automation: automationRecord(
    "The automation record. An existing automation with the same key and identical configuration is returned instead of a duplicate.",
    {
      created: booleanField(
        "True when a new automation was created; false when the key already existed."
      ),
    }
  ),
  search_automations: listField(
    "Visible automations matching the query.",
    automationRecord("Automation record with trigger and access.")
  ),
  read_automation: {
    ...automationRecord(
      "The automation record with trigger and access; null when not found."
    ),
    type: ["object", "null"],
  },
  update_automation: automationRecord(
    "The automation record after the update."
  ),
  delete_automation: resultSchema({
    required: ["deleted", "automationId"],
    properties: {
      deleted: { type: "boolean", const: true },
      automationId: stringField("The removed automation's ID."),
    },
  }),
} satisfies SchemaMap
