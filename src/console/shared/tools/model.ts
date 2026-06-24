export type ToolAccess = "read" | "write"

export type ToolCapability = {
  access: ToolAccess
  description: string
  label: string
  requiresApproval?: boolean
  tool: string
}

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
