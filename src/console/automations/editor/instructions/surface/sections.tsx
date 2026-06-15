import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  groupToolsByAccess,
  type ToolAccessGroup,
  ToolGroupSection,
  ToolGroupsFrame,
  ToolRowContent,
} from "@/console/permissions/tools"
import { cn } from "@/lib/utils"
import { type ToolPermission } from "../../../../permissions/controller"
import {
  automationToolModeDescription,
  isAutomationToolSelectable,
} from "../../../surface/policy"

type AutomationSurfaceToolGroupsProps = {
  onToolsChange: (tools: string[]) => void
  permissions: ToolPermission[]
  tools: string[]
}

export function AutomationSurfaceToolGroups({
  onToolsChange,
  permissions,
  tools,
}: AutomationSurfaceToolGroupsProps) {
  const selectedTools = new Set(tools)

  function setTool(tool: string, enabled: boolean) {
    const nextTools = new Set(selectedTools)

    if (enabled) {
      nextTools.add(tool)
    } else {
      nextTools.delete(tool)
    }

    onToolsChange([...nextTools])
  }

  function setGroupTools(groupTools: ToolPermission[], enabled: boolean) {
    const nextTools = new Set(selectedTools)

    for (const permission of groupTools) {
      if (enabled && isAutomationToolSelectable(permission)) {
        nextTools.add(permission.tool)
        continue
      }

      if (!enabled) {
        nextTools.delete(permission.tool)
      }
    }

    onToolsChange([...nextTools])
  }

  return (
    <ToolGroupsFrame>
      {groupToolsByAccess(permissions).map((group) => (
        <EditableToolGroup
          group={group}
          key={group.access}
          onGroupChange={setGroupTools}
          onToolChange={setTool}
          selectedTools={selectedTools}
        />
      ))}
    </ToolGroupsFrame>
  )
}

function EditableToolGroup({
  group,
  onGroupChange,
  onToolChange,
  selectedTools,
}: {
  group: ToolAccessGroup<ToolPermission>
  onGroupChange: (tools: ToolPermission[], enabled: boolean) => void
  onToolChange: (tool: string, enabled: boolean) => void
  selectedTools: Set<string>
}) {
  const selectableTools = group.tools.filter(isAutomationToolSelectable)
  const selectedCount = selectableTools.filter((permission) =>
    selectedTools.has(permission.tool)
  ).length
  const hasSelectableTools = selectableTools.length > 0
  const allSelectableSelected =
    hasSelectableTools && selectedCount === selectableTools.length

  return (
    <ToolGroupSection
      access={group.access}
      action={
        hasSelectableTools ? (
          <Button
            aria-label={`${allSelectableSelected ? "Clear" : "Select all"} ${group.access} tools`}
            onClick={() => onGroupChange(group.tools, !allSelectableSelected)}
            size="sm"
            type="button"
            variant="link"
          >
            {allSelectableSelected ? "Clear" : "Select all"}
          </Button>
        ) : null
      }
      badge={`${selectedCount} of ${selectableTools.length} selected`}
    >
      {group.tools.map((permission) => (
        <EditableToolRow
          key={permission.tool}
          onCheckedChange={(enabled) => onToolChange(permission.tool, enabled)}
          permission={permission}
          selected={selectedTools.has(permission.tool)}
        />
      ))}
    </ToolGroupSection>
  )
}

function EditableToolRow({
  onCheckedChange,
  permission,
  selected,
}: {
  onCheckedChange: (enabled: boolean) => void
  permission: ToolPermission
  selected: boolean
}) {
  const checkboxId = useId()
  const descriptionId = `${checkboxId}-description`
  const selectable = isAutomationToolSelectable(permission)
  const disabled = !selectable && !selected

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] gap-3 border-b p-3 last:border-b-0",
        disabled && "bg-muted/30"
      )}
    >
      <Checkbox
        aria-describedby={descriptionId}
        checked={selected}
        className="mt-0.5"
        disabled={disabled}
        id={checkboxId}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <ToolRowContent
        accessories={<ToolModeBadge permission={permission} />}
        description={getToolDescription(permission)}
        descriptionId={descriptionId}
        muted={disabled}
        title={
          <Label
            className={cn(
              "font-medium text-sm",
              disabled && "text-muted-foreground"
            )}
            htmlFor={checkboxId}
          >
            {permission.label}
          </Label>
        }
      />
    </div>
  )
}

function ToolModeBadge({ permission }: { permission: ToolPermission }) {
  if (permission.mode !== "blocked" && permission.mode !== "prompted") {
    return null
  }

  return (
    <Badge
      variant={permission.mode === "blocked" ? "destructive" : "secondary"}
    >
      {permission.mode === "prompted" ? "Approval required" : "Blocked"}
    </Badge>
  )
}

function getToolDescription(permission: ToolPermission) {
  if (permission.mode === "allowed" || permission.mode === "required") {
    return permission.description
  }

  return `${permission.description} ${automationToolModeDescription(permission)}`
}
