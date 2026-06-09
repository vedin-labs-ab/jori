import { ChevronDown, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { LoadingMessage } from "../loading"
import {
  type ConfigurablePermissionMode,
  type ToolAccess,
  type ToolPermission,
  type ToolPermissionController,
  type ToolProvider,
} from "./controller"
import { PermissionRow } from "./row"

export function PermissionSection({
  controller,
  emptyLabel,
  provider,
  title,
}: {
  controller: ToolPermissionController
  emptyLabel: string
  provider: ToolProvider
  title: string
}) {
  const [isOpen, setIsOpen] = useState(true)
  const permissions =
    controller.permissions === undefined || controller.permissions === null
      ? []
      : controller.getProviderPermissions(provider)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldCheck className="size-4 text-muted-foreground" />
            {title}
          </div>
          <PermissionSummary permissions={permissions} />
        </div>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${isOpen ? "Hide" : "Show"} ${title.toLowerCase()}`}
          >
            <ChevronDown
              className={
                isOpen
                  ? "rotate-180 transition-transform"
                  : "transition-transform"
              }
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-3">
        <PermissionContent
          controller={controller}
          emptyLabel={emptyLabel}
          provider={provider}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}

function PermissionContent({
  controller,
  emptyLabel,
  provider,
}: {
  controller: ToolPermissionController
  emptyLabel: string
  provider: ToolProvider
}) {
  if (controller.permissions === undefined) {
    return <LoadingMessage label="Loading permissions" />
  }

  if (controller.permissions === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permission access unavailable</AlertTitle>
        <AlertDescription>
          Sign in again to manage tool permissions.
        </AlertDescription>
      </Alert>
    )
  }

  const permissions = controller.getProviderPermissions(provider)

  if (permissions.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="grid gap-5">
      <ProviderPermissionError
        error={controller.error}
        permissions={permissions}
      />
      <PermissionGroup
        access="read"
        onUpdate={controller.updatePermission}
        pendingTool={controller.pendingTool}
        permissions={permissions}
      />
      <PermissionGroup
        access="write"
        onUpdate={controller.updatePermission}
        pendingTool={controller.pendingTool}
        permissions={permissions}
      />
    </div>
  )
}

function PermissionSummary({ permissions }: { permissions: ToolPermission[] }) {
  if (permissions.length === 0) {
    return null
  }

  const allowedCount = permissions.filter(
    (permission) => permission.mode === "allowed"
  ).length
  const requiredCount = permissions.filter(
    (permission) => permission.mode === "required"
  ).length

  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span>{allowedCount} allowed</span>
      <span aria-hidden="true" className="size-1 rounded-full bg-current" />
      {requiredCount} required
    </div>
  )
}

function PermissionGroup({
  access,
  onUpdate,
  pendingTool,
  permissions,
}: {
  access: ToolAccess
  onUpdate: (tool: string, mode: ConfigurablePermissionMode) => void
  pendingTool: string | undefined
  permissions: ToolPermission[]
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
      <div className="divide-y divide-border/80">
        {groupPermissions.map((permission) => (
          <PermissionRow
            key={permission.tool}
            onUpdate={onUpdate}
            pendingTool={pendingTool}
            permission={permission}
          />
        ))}
      </div>
    </div>
  )
}

function ProviderPermissionError({
  error,
  permissions,
}: {
  error: ToolPermissionController["error"]
  permissions: ToolPermission[]
}) {
  if (
    error === undefined ||
    !permissions.some((permission) => permission.tool === error.tool)
  ) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Permission update failed</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
