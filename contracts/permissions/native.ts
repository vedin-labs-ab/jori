import { type CodingToolName, codingToolDefinitions } from "../coding"
import { type ToolPermissionRow } from "./index"

export const nativeToolPermissionRows = [
  [
    "milo",
    "finish_run",
    "Finish run",
    "Mark the current run as finished.",
    "Finish this agentic run. If this run has an active requester surface and no visible communication was sent, include reason explaining why none is warranted. The reason is internal and is not shown to the requester.",
    "write",
    "required",
    "run",
  ],
  [
    "milo",
    "send_reply",
    "Send reply",
    "Reply where the request came from.",
    "Send a visible reply or update to the active requester surface, written like a teammate in the channel, not a status report. Milo routes it to the current requester context by default.",
    "write",
    "required",
    "surface",
  ],
  [
    "milo",
    "add_reaction",
    "Add reaction",
    "Add a reaction where the request came from.",
    "Add a visible reaction on the active requester surface.",
    "write",
    "required",
    "surface",
  ],
  [
    "milo",
    "read",
    "Read file",
    "Read files Milo is working with.",
    codingToolUsage("read"),
    "read",
    "required",
    "sandbox",
  ],
  [
    "milo",
    "grep",
    "Search files",
    "Search inside files Milo is working with.",
    codingToolUsage("grep"),
    "read",
    "required",
    "sandbox",
  ],
  [
    "milo",
    "glob",
    "Find files",
    "Find files by name pattern.",
    codingToolUsage("glob"),
    "read",
    "required",
    "sandbox",
  ],
  [
    "milo",
    "git",
    "Git",
    "Inspect repository history and changes.",
    codingToolUsage("git"),
    "read",
    "required",
    "sandbox",
  ],
  [
    "milo",
    "apply_patch",
    "Edit files",
    "Apply source code changes to files Milo is working with.",
    codingToolUsage("apply_patch"),
    "write",
    "required",
    "sandbox",
  ],
  [
    "milo",
    "bash",
    "Run command",
    "Run shell commands while working on files.",
    codingToolUsage("bash"),
    "write",
    "required",
    "sandbox",
  ],
  [
    "milo",
    "start_agent",
    "Start agent",
    "Start another Milo run for delegated work.",
    "Start a Milo agent run for a delegated task.",
    "write",
    "required",
    "agent",
  ],
] satisfies ToolPermissionRow[]

function codingToolUsage(name: CodingToolName) {
  const definition = codingToolDefinitions.find((tool) => tool.name === name)

  if (definition === undefined) {
    throw new Error(`Unknown coding tool: ${name}`)
  }

  return definition.description
}
