import { type ToolPermission } from "../../../permissions/controller"

export type AutomationToolCapability = Pick<
  ToolPermission,
  "access" | "description" | "label" | "tool"
>

export type ToolAccess = AutomationToolCapability["access"]

export type ToolAccessGroup<T extends AutomationToolCapability> = {
  access: ToolAccess
  tools: T[]
}

export function groupToolsByAccess<T extends AutomationToolCapability>(
  tools: T[]
) {
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
