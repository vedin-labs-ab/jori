import { type CodingToolName, codingToolDefinitions } from "../../coding"
import { type ToolPermissionRow } from "../types"

export const nativeToolPermissionRows = [
  [
    "milo",
    "finish_run",
    "Finish run",
    "Mark the current run as finished.",
    "Finish this agentic run. If this run has an active requester surface and no visible communication was sent, include reason explaining why none is warranted. The reason is internal and is not shown to the requester. When this run was delegated by a parent run, return your outcome in result — the parent receives it from wait_for_agents.",
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
    "Start a Milo agent run for a delegated task. Always give it a concise title that identifies the work, and state in the task what it should return — its finish_run result comes back from wait_for_agents. It works independently with your integration and web tool access unless tools narrows it. Grant the least access that covers the task — the agent can never hold access you lack.",
    "write",
    "required",
    "agent",
  ],
  [
    "milo",
    "wait_for_agents",
    "Wait for agents",
    "Pause until delegated agents finish or a timeout is reached.",
    "Wait for 1-20 direct child agents without consuming compute. Resume when every listed run is terminal or the relative timeout is reached, whichever comes first. Each terminal run includes the result its finish_run returned; a missing result on a failed, stopped, or timed-out child is a gap for you to handle.",
    "read",
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
