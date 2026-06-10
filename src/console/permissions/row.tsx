import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type ConfigurablePermissionMode,
  type PermissionMode,
  type ToolPermission,
} from "./controller"

const modeLabels: Record<PermissionMode, string> = {
  required: "Required",
  allowed: "Allowed",
  prompted: "Prompted",
  blocked: "Blocked",
}

const configurableModes = ["allowed", "prompted", "blocked"] as const

export function PermissionRow({
  onUpdate,
  pendingTool,
  permission,
}: {
  onUpdate: (tool: string, mode: ConfigurablePermissionMode) => void
  pendingTool: string | undefined
  permission: ToolPermission
}) {
  const modes =
    permission.mode === "required" ? (["required"] as const) : configurableModes

  return (
    <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-1">
        <div className="font-medium text-sm">{permission.label}</div>
        <div className="text-xs text-muted-foreground">
          {permission.description}
        </div>
      </div>
      <Select
        value={permission.mode}
        onValueChange={(mode) =>
          onUpdate(permission.tool, mode as ConfigurablePermissionMode)
        }
        disabled={
          permission.mode === "required" || pendingTool === permission.tool
        }
      >
        <SelectTrigger
          aria-label={`${permission.label} permission`}
          className="w-28 justify-self-start sm:justify-self-end"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {modeLabels[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
