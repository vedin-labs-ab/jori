import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type ToolPermission } from "../../../permissions/controller"
import {
  automationToolModeDescription,
  isAutomationToolSelectable,
} from "../../policy"

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
  const permissionGroups = (["read", "write"] as const)
    .map((access) => ({
      access,
      permissions: permissions.filter(
        (permission) => permission.access === access
      ),
    }))
    .filter((group) => group.permissions.length > 0)

  function setTool(tool: string, enabled: boolean) {
    const nextTools = new Set(selectedTools)

    if (enabled) {
      nextTools.add(tool)
    } else {
      nextTools.delete(tool)
    }

    onToolsChange([...nextTools])
  }

  function setGroupTools(groupPermissions: ToolPermission[], enabled: boolean) {
    const nextTools = new Set(selectedTools)

    for (const permission of groupPermissions) {
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
    <div className="grid gap-7 px-6 pb-6">
      {permissionGroups.map((group) => (
        <AutomationToolGroup
          access={group.access}
          key={group.access}
          onGroupChange={setGroupTools}
          onToolChange={setTool}
          permissions={group.permissions}
          selectedTools={selectedTools}
        />
      ))}
    </div>
  )
}

type AutomationToolGroupProps = {
  access: ToolPermission["access"]
  onGroupChange: (permissions: ToolPermission[], enabled: boolean) => void
  onToolChange: (tool: string, enabled: boolean) => void
  permissions: ToolPermission[]
  selectedTools: Set<string>
}

function AutomationToolGroup({
  access,
  onGroupChange,
  onToolChange,
  permissions,
  selectedTools,
}: AutomationToolGroupProps) {
  const selectablePermissions = permissions.filter(isAutomationToolSelectable)
  const selectedCount = selectablePermissions.filter((permission) =>
    selectedTools.has(permission.tool)
  ).length
  const hasSelectableTools = selectablePermissions.length > 0
  const allSelectableSelected =
    hasSelectableTools && selectedCount === selectablePermissions.length

  return (
    <section className="grid gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="font-semibold text-lg capitalize">{access}</h3>
          <Badge
            className="h-6 shrink-0 rounded-md px-2.5 font-normal text-muted-foreground text-xs"
            variant="secondary"
          >
            {selectedCount} of {selectablePermissions.length} selected
          </Badge>
        </div>
        {hasSelectableTools ? (
          <Button
            aria-label={`${allSelectableSelected ? "Clear" : "Select all"} ${access} tools`}
            className="h-auto px-1 font-medium text-primary hover:bg-transparent hover:text-primary/80"
            onClick={() => onGroupChange(permissions, !allSelectableSelected)}
            type="button"
            variant="ghost"
          >
            {allSelectableSelected ? "Clear" : "Select all"}
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-lg border">
        {permissions.map((permission) => (
          <AutomationToolRow
            key={permission.tool}
            onCheckedChange={(enabled) =>
              onToolChange(permission.tool, enabled)
            }
            permission={permission}
            selected={selectedTools.has(permission.tool)}
          />
        ))}
      </div>
    </section>
  )
}

type AutomationToolRowProps = {
  onCheckedChange: (enabled: boolean) => void
  permission: ToolPermission
  selected: boolean
}

function AutomationToolRow({
  onCheckedChange,
  permission,
  selected,
}: AutomationToolRowProps) {
  const checkboxId = useId()
  const descriptionId = `${checkboxId}-description`
  const selectable = isAutomationToolSelectable(permission)
  const disabled = !selectable && !selected

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] gap-4 border-b p-5 last:border-b-0",
        disabled && "bg-muted/30"
      )}
    >
      <Checkbox
        aria-describedby={descriptionId}
        checked={selected}
        className="mt-0.5 size-5 rounded-md"
        disabled={disabled}
        id={checkboxId}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Label
            className={cn(
              "font-medium text-base",
              disabled && "text-muted-foreground"
            )}
            htmlFor={checkboxId}
          >
            {permission.label}
          </Label>
          {permission.mode === "blocked" || permission.mode === "prompted" ? (
            <span
              className={cn(
                "rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs",
                permission.mode === "blocked" &&
                  "bg-destructive/10 text-destructive"
              )}
            >
              {getToolModeLabel(permission)}
            </span>
          ) : null}
        </div>
        <p
          className="text-muted-foreground text-sm leading-relaxed"
          id={descriptionId}
        >
          {getToolDescription(permission)}
        </p>
      </div>
    </div>
  )
}

function getToolModeLabel(permission: ToolPermission) {
  return permission.mode === "prompted" ? "Approval required" : "Blocked"
}

function getToolDescription(permission: ToolPermission) {
  if (permission.mode === "allowed" || permission.mode === "required") {
    return permission.description
  }

  return `${permission.description} ${automationToolModeDescription(permission)}`
}
