import { runStatuses } from "../../../../../../contracts/runtime/runs"
import {
  type JsonSchema,
  numberProperty,
  objectSchema,
  stringArrayProperty,
  stringProperty,
} from "../fragments/common"

const runScopeEnum = ["conversation", "organization", "all"]
const runSourceEnum = ["slack", "github", "linear", "automation"]
const activityFilterEnum = [
  "tool",
  "model",
  "approval",
  "asset",
  "agent",
  "error",
]

export const runJoriToolInputSchemas = {
  search_runs: searchRunsInputSchema(),
  search_run_activity: searchRunActivityInputSchema(),
}

function searchRunsInputSchema(): JsonSchema {
  return {
    description:
      "Find visible runs. Choose exactly one mode for the lookup intent.",
    oneOf: [
      searchModeSchema(),
      idsModeSchema(),
      childrenModeSchema(),
      treeModeSchema(),
    ],
  }
}

function searchModeSchema() {
  return objectSchema({
    required: ["mode"],
    properties: {
      mode: modeProperty("search", "Search or list runs by visibility scope."),
      scope: scopeProperty(),
      ...filterProperties(),
      ...pageProperties(),
    },
  })
}

function idsModeSchema() {
  return objectSchema({
    required: ["mode", "runIds"],
    properties: {
      mode: modeProperty("ids", "Resolve known run IDs directly."),
      runIds: {
        ...stringArrayProperty(
          "Known run IDs returned by search_runs, or the current Run ID from system context."
        ),
        maxItems: 50,
        minItems: 1,
      },
    },
  })
}

function childrenModeSchema() {
  return objectSchema({
    required: ["mode", "parentId"],
    properties: {
      mode: modeProperty(
        "children",
        "List direct child runs for a parent run."
      ),
      parentId: stringProperty("Parent run ID for direct child navigation."),
      ...filterProperties(),
      ...pageProperties(),
    },
  })
}

function treeModeSchema() {
  return objectSchema({
    required: ["mode", "rootId"],
    properties: {
      mode: modeProperty("tree", "List runs in one delegation tree."),
      rootId: stringProperty("Root run ID for delegation-tree navigation."),
      ...filterProperties(),
      ...pageProperties(),
    },
  })
}

function modeProperty(value: string, description: string) {
  return { type: "string", enum: [value], description }
}

function scopeProperty() {
  return {
    type: "string",
    enum: runScopeEnum,
    description:
      "Relevance scope within enforced visibility. Defaults to conversation; use organization or all deliberately.",
  }
}

function filterProperties() {
  return {
    query: stringProperty(
      "Case-insensitive substring filter over title, task, trigger, and context labels. Not regex, fuzzy, or semantic search."
    ),
    status: {
      type: "string",
      enum: runStatuses,
      description: "Run status filter.",
    },
    source: {
      type: "string",
      enum: runSourceEnum,
      description: "Source filter.",
    },
    since: numberProperty(
      "Only runs created at or after this positive epoch millisecond."
    ),
    until: numberProperty(
      "Only runs created at or before this positive epoch millisecond."
    ),
  }
}

function pageProperties() {
  return {
    cursor: stringProperty(
      "Opaque cursor from a previous search_runs response with the same mode and filters."
    ),
    limit: numberProperty("Maximum runs to return. Defaults to 15.", 1, 50),
  }
}

function searchRunActivityInputSchema() {
  return objectSchema({
    description: "Inspect one visible run.",
    required: ["runId"],
    properties: {
      runId: stringProperty(
        "Run ID returned by search_runs, or the current Run ID from system context."
      ),
      filter: {
        type: "array",
        description: "Optional activity kinds to include.",
        items: {
          type: "string",
          enum: activityFilterEnum,
        },
      },
      cursor: stringProperty(
        "Opaque cursor from a previous search_run_activity response."
      ),
      limit: numberProperty(
        "Maximum activity items to return. Defaults to 20.",
        1,
        50
      ),
    },
  })
}
