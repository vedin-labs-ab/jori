export const codingToolNames = [
  "read",
  "grep",
  "glob",
  "git",
  "apply_patch",
  "bash",
] as const

export type CodingToolName = (typeof codingToolNames)[number]

export type CodingToolDefinition = {
  description: string
  inputSchema: Record<string, unknown>
  name: CodingToolName
}

export const codingToolDefinitions = [
  {
    name: "read",
    description: "Read a bounded line range from a workspace file.",
    inputSchema: objectSchema(["path"], {
      path: stringSchema("Workspace-relative or absolute file path."),
      offset: numberSchema("One-based line number to start reading from."),
      limit: numberSchema("Maximum lines to read."),
    }),
  },
  {
    name: "grep",
    description:
      "Search workspace file contents with a regular expression and bounded results.",
    inputSchema: objectSchema(["pattern"], {
      pattern: stringSchema("JavaScript regular expression to search for."),
      path: stringSchema("Optional workspace path to search within."),
      include: stringSchema("Optional glob pattern for matching file paths."),
      limit: numberSchema("Maximum matches to return."),
    }),
  },
  {
    name: "glob",
    description: "Find workspace files by glob pattern with bounded results.",
    inputSchema: objectSchema(["pattern"], {
      pattern: stringSchema("Glob pattern, for example src/**/*.ts."),
      path: stringSchema("Optional workspace directory to search within."),
      limit: numberSchema("Maximum paths to return."),
    }),
  },
  {
    name: "git",
    description:
      'Preferred tool for read-only Git inspection after a repository is cloned into the workspace. Use args without the leading git executable, for example ["status", "--short"], ["log", "--oneline", "-10"], ["show", "--stat", "<sha>"], or ["diff", "<base>...HEAD"]. Git writes such as add, commit, checkout, reset, fetch, pull, and push are not allowed.',
    inputSchema: objectSchema(["args"], {
      args: arraySchema(
        'Git arguments without the leading git executable, for example ["log", "--oneline", "-5"].'
      ),
      cwd: stringSchema("Optional workspace directory to run from."),
      timeoutMs: numberSchema("Optional command timeout in milliseconds."),
    }),
  },
  {
    name: "apply_patch",
    description: "Apply a unified diff patch to files inside the workspace.",
    inputSchema: objectSchema(["patch"], {
      patch: stringSchema("Unified diff patch to apply."),
    }),
  },
  {
    name: "bash",
    description:
      "Run a one-shot shell command in the workspace sandbox for non-Git work. Use provider clone tools to clone repositories, the git tool for Git inspection, and apply_patch for file edits.",
    inputSchema: objectSchema(["command"], {
      command: stringSchema("Shell command to execute."),
      cwd: stringSchema("Optional workspace directory to run from."),
      timeoutMs: numberSchema("Optional command timeout in milliseconds."),
    }),
  },
] as const satisfies readonly CodingToolDefinition[]

export function isCodingToolName(name: string): name is CodingToolName {
  return (codingToolNames as readonly string[]).includes(name)
}

function objectSchema(
  required: string[],
  properties: Record<string, Record<string, unknown>>
) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  }
}

function numberSchema(description: string) {
  return {
    type: "number",
    description,
  }
}

function stringSchema(description: string) {
  return {
    type: "string",
    description,
  }
}

function arraySchema(description: string) {
  return {
    type: "array",
    description,
    items: {
      type: "string",
    },
  }
}
