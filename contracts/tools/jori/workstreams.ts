import { numberProperty, objectSchema } from "../fragments/common"

export const workstreamJoriToolInputSchemas = {
  read_workstreams: objectSchema({
    description:
      "Read the workstream roster with recent journal entries and citations.",
    properties: {
      days: numberProperty(
        "Day window for journal entries. Defaults to 7.",
        1,
        60
      ),
    },
  }),
}
