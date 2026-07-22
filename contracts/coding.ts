type CodingToolDefinition = {
  description: string
  inputSchema: Record<string, unknown>
  name: string
}

export const codingToolDefinitions = [
  {
    name: "read",
    description:
      "Read a bounded line range from a file under /home/user/workspace.",
    inputSchema: objectSchema(["path"], {
      path: stringSchema("Workspace-relative or absolute file path."),
      offset: numberSchema("One-based line number to start reading from."),
      limit: numberSchema("Maximum lines to read."),
    }),
  },
  {
    name: "grep",
    description:
      "Search file contents under /home/user/workspace with a regular expression and bounded results.",
    inputSchema: objectSchema(["pattern"], {
      pattern: stringSchema("JavaScript regular expression to search for."),
      path: stringSchema("Optional workspace path to search within."),
      include: stringSchema("Optional glob pattern for matching file paths."),
      limit: numberSchema("Maximum matches to return."),
    }),
  },
  {
    name: "glob",
    description:
      "Find files under /home/user/workspace by glob pattern with bounded results.",
    inputSchema: objectSchema(["pattern"], {
      pattern: stringSchema("Glob pattern, for example src/**/*.ts."),
      path: stringSchema("Optional workspace directory to search within."),
      limit: numberSchema("Maximum paths to return."),
    }),
  },
  {
    name: "git",
    description:
      'Preferred tool for read-only Git inspection after a repository is cloned into /home/user/workspace/<repo>. Use cwd for the repo directory, and use args without the leading git executable, for example ["status", "--short"], ["log", "--oneline", "-10"], ["show", "--stat", "<sha>"], or ["diff", "<base>...HEAD"]. Git writes such as add, commit, checkout, reset, fetch, pull, and push are not allowed.',
    inputSchema: objectSchema(["args"], {
      args: arraySchema(
        'Git arguments without the leading git executable, for example ["log", "--oneline", "-5"].'
      ),
      cwd: stringSchema(
        'Optional workspace directory to run from, for example "milo". Defaults to /home/user/workspace.'
      ),
      timeoutMs: numberSchema("Optional command timeout in milliseconds."),
    }),
  },
  {
    name: "apply_patch",
    description:
      "Apply a patch to files under /home/user/workspace, as a unified diff or a *** Begin Patch envelope.",
    inputSchema: objectSchema(["patch"], {
      patch: stringSchema(
        "The patch: a unified diff, or a *** Begin Patch / *** End Patch envelope with Add File, Update File, and Delete File sections."
      ),
      cwd: stringSchema(
        'Optional workspace directory to apply from, for example "milo". Defaults to /home/user/workspace.'
      ),
    }),
  },
  {
    name: "bash",
    description:
      "Run a one-shot shell command in the workspace sandbox for non-Git work. Use provider clone tools to clone repositories, the git tool for Git inspection, and apply_patch for file edits.",
    inputSchema: objectSchema(["command"], {
      command: stringSchema("Shell command to execute."),
      cwd: stringSchema(
        'Optional workspace directory to run from, for example "milo". Defaults to /home/user/workspace.'
      ),
      timeoutMs: numberSchema("Optional command timeout in milliseconds."),
    }),
  },
] as const satisfies readonly CodingToolDefinition[]

export const codingToolNames = codingToolDefinitions.map(({ name }) => name)

export type CodingToolName = (typeof codingToolDefinitions)[number]["name"]

export function isCodingToolName(name: string): name is CodingToolName {
  return codingToolNames.some((candidate) => candidate === name)
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
