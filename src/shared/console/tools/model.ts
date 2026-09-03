import {
  getToolPermission,
  type ToolAccess,
  type ToolCapability,
} from "@contracts/permissions"

export type {
  ToolAccess,
  ToolCapability,
  UserVisibleToolPermission as ToolPermission,
} from "@contracts/permissions"

export type ToolAccessGroup<T extends ToolCapability> = {
  access: ToolAccess
  tools: T[]
}

export function groupToolsByAccess<T extends ToolCapability>(tools: T[]) {
  return (["read", "write"] as const)
    .map((access) => ({
      access,
      tools: tools.filter((tool) => tool.access === access),
    }))
    .filter((group) => group.tools.length > 0)
}

export function accessLabel(access: ToolAccess) {
  return access === "read" ? "Read" : "Write"
}

/** A tool as the catalog describes it, for listing what a job or a run
 *  may call; a tool the catalog no longer knows keeps its name. */
export function toolCapability(tool: string): ToolCapability {
  const permission = getToolPermission(tool)

  return {
    access: permission?.access ?? "read",
    description: permission?.description ?? "",
    label: permission?.label ?? tool,
    tool,
  }
}
