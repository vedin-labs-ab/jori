/** The one directory the coding tools work inside. The sandbox template
 *  creates it and every tool path resolves against it, so both sides of the
 *  sandbox read the name from here. */
export const sandboxWorkspace = "/home/user/workspace"

export const codingLimits = {
  readOffset: 1_000_000,
  readLines: 2_000,
  grepMatches: 500,
  globPaths: 1_000,
  timeoutMinimum: 1_000,
  timeoutMaximum: 1_200_000,
}

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
      offset: integerSchema(
        "One-based line number to start reading from.",
        codingLimits.readOffset
      ),
      limit: integerSchema("Maximum lines to read.", codingLimits.readLines),
    }),
  },
  {
    name: "grep",
    description:
      "Search file contents under /home/user/workspace with a regular expression and bounded results.",
    inputSchema: objectSchema(["pattern"], {
      pattern: stringSchema("JavaScript regular expression to search for."),
      path: stringSchema("Optional workspace path to search within."),
      include: stringSchema(
        "Optional glob pattern relative to the search directory. When path names a file, match its filename."
      ),
      limit: integerSchema(
        "Maximum matches to return.",
        codingLimits.grepMatches
      ),
    }),
  },
  {
    name: "glob",
    description:
      "Find files under /home/user/workspace by glob pattern with bounded results.",
    inputSchema: objectSchema(["pattern"], {
      pattern: stringSchema(
        "Glob pattern relative to the search directory, for example src/**/*.ts."
      ),
      path: stringSchema("Optional workspace directory to search within."),
      limit: integerSchema("Maximum paths to return.", codingLimits.globPaths),
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
        'Optional workspace directory to run from, for example "jori". Defaults to /home/user/workspace.'
      ),
      timeoutMs: timeoutSchema(),
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
        'Optional workspace directory to apply from, for example "jori". Defaults to /home/user/workspace.'
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
        'Optional workspace directory to run from, for example "jori". Defaults to /home/user/workspace.'
      ),
      timeoutMs: timeoutSchema(),
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

function integerSchema(description: string, maximum: number, minimum = 1) {
  return {
    type: "integer",
    minimum,
    maximum,
    description,
  }
}

function timeoutSchema() {
  return integerSchema(
    "Optional command timeout in milliseconds.",
    codingLimits.timeoutMaximum,
    codingLimits.timeoutMinimum
  )
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
