import { useId } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type ToolPermission } from "../../../permissions/controller"
import {
  type AutomationPolicyPermissions,
  automationToolModeDescription,
  isAutomationToolSelectable,
} from "../../policy"
import { type AutomationSurfaceFormValue } from "../../surfaces"

export function AutomationSurfaceToolsDialog({
  onOpenChange,
  onToolsChange,
  open,
  permissions,
  provider,
  providerLabel,
  tools,
}: {
  onOpenChange: (open: boolean) => void
  onToolsChange: (tools: string[]) => void
  open: boolean
  permissions: AutomationPolicyPermissions
  provider: AutomationSurfaceFormValue["provider"]
  providerLabel: string
  tools: string[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{providerLabel} tools</DialogTitle>
          <DialogDescription>
            Choose the exact tools this automation can use.
          </DialogDescription>
        </DialogHeader>
        <AutomationSurfaceToolsContent
          onToolsChange={onToolsChange}
          permissions={permissions}
          provider={provider}
          tools={tools}
        />
      </DialogContent>
    </Dialog>
  )
}

function AutomationSurfaceToolsContent({
  onToolsChange,
  permissions,
  provider,
  tools,
}: {
  onToolsChange: (tools: string[]) => void
  permissions: AutomationPolicyPermissions
  provider: AutomationSurfaceFormValue["provider"]
  tools: string[]
}) {
  if (permissions === undefined) {
    return (
      <p className="text-muted-foreground text-sm">
        Loading integration permissions...
      </p>
    )
  }

  if (permissions === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permissions unavailable</AlertTitle>
        <AlertDescription>
          Sign in again to manage automation tools.
        </AlertDescription>
      </Alert>
    )
  }

  const providerPermissions = permissions.filter(
    (permission) => permission.provider === provider
  )

  if (providerPermissions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No tools are registered for this integration.
      </p>
    )
  }

  return (
    <AutomationSurfaceToolGroups
      onToolsChange={onToolsChange}
      permissions={providerPermissions}
      tools={tools}
    />
  )
}

function AutomationSurfaceToolGroups({
  onToolsChange,
  permissions,
  tools,
}: {
  onToolsChange: (tools: string[]) => void
  permissions: ToolPermission[]
  tools: string[]
}) {
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

  return (
    <div className="grid gap-5">
      <AutomationToolGroup
        access="read"
        onToolChange={setTool}
        permissions={permissions}
        selectedTools={selectedTools}
      />
      <AutomationToolGroup
        access="write"
        onToolChange={setTool}
        permissions={permissions}
        selectedTools={selectedTools}
      />
    </div>
  )
}

function AutomationToolGroup({
  access,
  onToolChange,
  permissions,
  selectedTools,
}: {
  access: "read" | "write"
  onToolChange: (tool: string, enabled: boolean) => void
  permissions: ToolPermission[]
  selectedTools: Set<string>
}) {
  const groupPermissions = permissions.filter(
    (permission) => permission.access === access
  )

  if (groupPermissions.length === 0) {
    return null
  }

  return (
    <div className="grid gap-2">
      <div className="font-medium text-muted-foreground text-xs capitalize">
        {access}
      </div>
      <div className="divide-y divide-border rounded-md border">
        {groupPermissions.map((permission) => (
          <AutomationToolRow
            key={permission.tool}
            onToolChange={onToolChange}
            permission={permission}
            selected={selectedTools.has(permission.tool)}
          />
        ))}
      </div>
    </div>
  )
}

function AutomationToolRow({
  onToolChange,
  permission,
  selected,
}: {
  onToolChange: (tool: string, enabled: boolean) => void
  permission: ToolPermission
  selected: boolean
}) {
  const id = `${useId()}-${permission.tool}`
  const selectable = isAutomationToolSelectable(permission)
  const disabled = !selectable && !selected

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 p-3">
      <Checkbox
        aria-describedby={`${id}-description`}
        checked={selected}
        className="mt-0.5"
        disabled={disabled}
        id={id}
        onCheckedChange={(checked) => {
          if (checked === true && !selectable) {
            return
          }

          onToolChange(permission.tool, checked === true)
        }}
      />
      <div className="grid gap-1">
        <Label htmlFor={id} className="font-medium text-sm">
          {permission.label}
        </Label>
        <p
          className={cn(
            "text-xs leading-relaxed",
            selectable ? "text-muted-foreground" : "text-destructive"
          )}
          id={`${id}-description`}
        >
          {permission.description} {automationToolModeDescription(permission)}
        </p>
      </div>
      <Badge className="mt-0.5 capitalize" variant="outline">
        {permission.access}
      </Badge>
    </div>
  )
}
