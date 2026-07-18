import {
  listField,
  nullableStringField,
  providerPayload,
  resultSchema,
  type SchemaMap,
} from "../common"

export const runMiloToolResponseSchemas = {
  search_runs: resultSchema({
    required: ["cursor", "runs"],
    properties: {
      cursor: nullableStringField(
        "Cursor for the next page; null when the listing is complete."
      ),
      runs: listField(
        "Visible runs matching the mode and filters.",
        providerPayload(
          "Run snapshot: id, title, status, source, trigger, timing, and relation fields."
        )
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
        providerPayload(
          "Activity entry: kind (tool, model, approval, asset, agent, or error) with its details."
        )
      ),
    },
  }),
} satisfies SchemaMap
