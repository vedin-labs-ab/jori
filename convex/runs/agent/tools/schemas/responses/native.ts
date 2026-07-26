import {
  arrayProperty,
  booleanProperty,
  constProperty,
  enumProperty,
  type JsonSchema,
  nullableStringProperty,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

// Native tools run on Jori's own runtime - sandbox, agent lifecycle, and
// surface delivery - so every response shape here is exact.

function commandOutput(tool: string): JsonSchema {
  return objectSchema({
    required: ["exitCode", "stdout", "stderr"],
    description: `Output of the ${tool} command.`,
    properties: {
      exitCode: numberProperty("Process exit code."),
      stdout: stringProperty("Captured standard output, bounded."),
      stderr: stringProperty("Captured standard error, bounded."),
      stdoutTruncated: booleanProperty("True when stdout was cut off."),
      stderrTruncated: booleanProperty("True when stderr was cut off."),
    },
  })
}

const agentRunSchema = objectSchema({
  properties: {
    runId: stringProperty("Run ID of the child."),
    title: stringProperty("The child's title."),
    status: enumProperty(
      ["queued", "running", "completed", "failed", "stopped"],
      "Where the child is in its lifecycle."
    ),
    error: nullableStringProperty("Why the child failed, when it did."),
    result: {
      type: ["string", "null"],
      description:
        "The outcome the child returned via finish_run; null until it completes.",
    },
  },
})

export const nativeToolResponseSchemas = {
  read: objectSchema({
    required: ["path", "content"],
    properties: {
      path: stringProperty("Workspace-relative file path."),
      startLine: numberProperty("First line returned."),
      endLine: numberProperty("Last line returned."),
      content: stringProperty("File content for the returned range."),
      truncated: booleanProperty("True when the range was cut off."),
    },
  }),
  grep: objectSchema({
    required: ["matches", "truncated"],
    properties: {
      matches: arrayProperty(
        "Matching lines across the searched files.",
        objectSchema({
          properties: {
            path: stringProperty("Workspace-relative file path."),
            lineNumber: numberProperty("1-indexed matching line."),
            line: stringProperty(
              "The matching line, bounded to 500 characters."
            ),
          },
        })
      ),
      truncated: booleanProperty("True when more matches existed."),
    },
  }),
  glob: objectSchema({
    required: ["paths", "truncated"],
    properties: {
      paths: arrayProperty("Matching workspace-relative paths.", {
        type: "string",
      }),
      truncated: booleanProperty("True when more matches existed."),
    },
  }),
  git: commandOutput("git"),
  bash: commandOutput("bash"),
  apply_patch: objectSchema({
    required: ["applied", "files"],
    properties: {
      applied: { type: "boolean", const: true },
      files: arrayProperty("Workspace-relative patched paths.", {
        type: "string",
      }),
    },
  }),
  start_agent: objectSchema({
    properties: {
      runId: stringProperty("Run ID of the started child."),
    },
  }),
  stop_agent: objectSchema({
    properties: {
      runId: stringProperty("Run ID of the stopped child."),
      status: stringProperty("The child's status after the stop."),
    },
  }),
  wait_for_agents: objectSchema({
    properties: {
      reason: enumProperty(
        ["completed", "timeout", "interrupted"],
        "Why the wait ended."
      ),
      runs: arrayProperty(
        "Every waited-on child with its result when terminal.",
        agentRunSchema
      ),
    },
  }),
  finish_run: objectSchema({
    required: ["communicated", "reason", "status"],
    properties: {
      communicated: booleanProperty(
        "Whether a visible communication was sent on the requester surface."
      ),
      reason: nullableStringProperty(
        "The internal no-communication reason, when one was given."
      ),
      status: constProperty("finished", "The run is finishing."),
    },
  }),
  send_reply: objectSchema({
    required: ["status"],
    properties: {
      status: constProperty("sent", "The reply was delivered to the surface."),
    },
  }),
  add_reaction: objectSchema({
    required: ["status"],
    properties: {
      status: constProperty("added", "The reaction was added on the surface."),
    },
  }),
} satisfies SchemaMap
