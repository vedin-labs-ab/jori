import {
  type ToolCapability,
  type ToolSurface,
} from "../../../../contracts/permissions"

export type RuntimeToolCapability = {
  surface: ToolSurface
  label: string
  tools: ToolCapability[]
}
