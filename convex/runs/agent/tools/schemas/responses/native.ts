import {
  booleanField,
  constField,
  enumField,
  type JsonSchema,
  listField,
  nullableStringField,
  numberField,
  resultSchema,
  type SchemaMap,
  stringField,
} from "./common"

// Native tools run on Milo's own runtime - sandbox, agent lifecycle, and
// surface delivery - so every response shape here is exact.

function commandOutput(tool: string): JsonSchema {
  return resultSchema({
    required: ["exitCode", "stdout", "stderr"],
    description: `Output of the ${tool} command.`,
    properties: {
      exitCode: numberField("Process exit code."),
      stdout: stringField("Captured standard output, bounded."),
      stderr: stringField("Captured standard error, bounded."),
      stdoutTruncated: booleanField("True when stdout was cut off."),
      stderrTruncated: booleanField("True when stderr was cut off."),
    },
  })
}

const agentRunSchema = resultSchema({
  properties: {
    runId: stringField("Run ID of the child."),
    title: stringField("The child's title."),
    status: enumField(
      ["queued", "running", "completed", "failed", "stopped"],
      "Where the child is in its lifecycle."
    ),
    error: nullableStringField("Why the child failed, when it did."),
    result: {
      type: ["string", "null"],
      description:
        "The outcome the child returned via finish_run; null until it completes.",
    },
  },
})

export const nativeToolResponseSchemas = {
  read: resultSchema({
    required: ["path", "content"],
    properties: {
      path: stringField("Workspace-relative file path."),
      startLine: numberField("First line returned."),
      endLine: numberField("Last line returned."),
      content: stringField("File content for the returned range."),
      truncated: booleanField("True when the range was cut off."),
    },
  }),
  grep: resultSchema({
    required: ["matches", "truncated"],
    properties: {
      matches: listField(
        "Matching lines across the searched files.",
        resultSchema({
          properties: {
            path: stringField("Workspace-relative file path."),
            lineNumber: numberField("1-indexed matching line."),
            line: stringField("The matching line, bounded to 500 characters."),
          },
        })
      ),
      truncated: booleanField("True when more matches existed."),
    },
  }),
  glob: resultSchema({
    required: ["paths", "truncated"],
    properties: {
      paths: listField("Matching workspace-relative paths.", {
        type: "string",
      }),
      truncated: booleanField("True when more matches existed."),
    },
  }),
  git: commandOutput("git"),
  bash: commandOutput("bash"),
  apply_patch: resultSchema({
    required: ["applied", "files"],
    properties: {
      applied: { type: "boolean", const: true },
      files: listField("Workspace-relative patched paths.", {
        type: "string",
      }),
    },
  }),
  start_agent: resultSchema({
    properties: {
      runId: stringField("Run ID of the started child."),
    },
  }),
  stop_agent: resultSchema({
    properties: {
      runId: stringField("Run ID of the stopped child."),
      status: stringField("The child's status after the stop."),
    },
  }),
  wait_for_agents: resultSchema({
    properties: {
      reason: enumField(
        ["completed", "timeout", "interrupted"],
        "Why the wait ended."
      ),
      runs: listField(
        "Every waited-on child with its result when terminal.",
        agentRunSchema
      ),
    },
  }),
  finish_run: resultSchema({
    required: ["communicated", "reason", "status"],
    properties: {
      communicated: booleanField(
        "Whether a visible communication was sent on the requester surface."
      ),
      reason: nullableStringField(
        "The internal no-communication reason, when one was given."
      ),
      status: constField("finished", "The run is finishing."),
    },
  }),
  send_reply: resultSchema({
    required: ["status"],
    properties: {
      status: constField("sent", "The reply was delivered to the surface."),
    },
  }),
  add_reaction: resultSchema({
    required: ["status"],
    properties: {
      status: constField("added", "The reaction was added on the surface."),
    },
  }),
} satisfies SchemaMap
