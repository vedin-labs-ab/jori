import {
  arrayProperty,
  nullableStringProperty,
  numberProperty,
  objectSchema,
  stringProperty,
} from "../common"

function receiptSchema() {
  return objectSchema({
    description: "One citation behind a journal entry.",
    required: ["why", "integration", "url"],
    properties: {
      why: stringProperty("The claim this receipt supports, as cited."),
      integration: nullableStringProperty(
        "Integration the receipt came from; null for internal references."
      ),
      url: nullableStringProperty(
        "Link to the cited source; null when the source has no stable URL."
      ),
    },
  })
}

function entrySchema() {
  return objectSchema({
    description: "One journal entry inside the window, newest first.",
    required: ["entry", "observedAt", "effort", "receipts"],
    properties: {
      entry: stringProperty("The narrated activity."),
      observedAt: numberProperty("Narrated date in epoch milliseconds."),
      effort: stringProperty("The effort the entry belongs to."),
      receipts: arrayProperty("Citations behind the entry.", receiptSchema()),
    },
  })
}

function workstreamSchema() {
  return objectSchema({
    description:
      "One confirmed workstream; an empty entries array means it went quiet.",
    required: ["workstreamId", "name", "brief", "seenAt", "sources", "entries"],
    properties: {
      workstreamId: stringProperty("Workstream ID."),
      name: stringProperty("The name people use for this body of work."),
      brief: stringProperty("What the workstream is."),
      seenAt: numberProperty(
        "Last sighting across all time, in epoch milliseconds."
      ),
      sources: arrayProperty("Integrations the workstream draws on.", {
        type: "string",
      }),
      entries: arrayProperty(
        "Journal entries inside the window, newest first.",
        entrySchema()
      ),
    },
  })
}

export const workstreamJoriToolResponseSchemas = {
  read_workstreams: objectSchema({
    required: ["now", "days", "workstreams"],
    properties: {
      now: numberProperty("Read time in epoch milliseconds."),
      days: numberProperty("Day window the entries cover."),
      workstreams: arrayProperty(
        "Confirmed workstreams, most recently active first.",
        workstreamSchema()
      ),
    },
  }),
}
