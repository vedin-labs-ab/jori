import { type ToolPermissionRow } from "./index"

export const miloToolPermissionRows = [
  [
    "milo",
    "list_capabilities",
    "List capabilities",
    "List current run tools, connected integration capabilities, and integrations available to connect.",
    "read",
    "required",
  ],
  [
    "milo",
    "load_skill",
    "Load skill",
    "Load full instructions for an available Milo skill.",
    "read",
    "required",
  ],
  [
    "milo",
    "save_attachment",
    "Save attachment",
    "Save a sandbox file as a run attachment.",
    "write",
    "required",
  ],
  [
    "milo",
    "generate_image",
    "Generate image",
    "Generate image attachment.",
    "write",
  ],
  [
    "milo",
    "search_attachments",
    "Search attachments",
    "Find saved run attachments that can be reused or sent.",
    "read",
  ],
  [
    "milo",
    "read_attachment",
    "Read attachment",
    "Inspect a saved run attachment by attachment ID.",
    "read",
  ],
] satisfies ToolPermissionRow[]
