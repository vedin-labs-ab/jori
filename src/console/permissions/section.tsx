import { ChevronDown, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group/permission-trigger flex w-full items-center justify-between rounded-md border border-transparent py-1 text-left transition-colors duration-200 outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:text-foreground dark:hover:bg-muted/50"
          aria-label={`${isOpen ? "Hide" : "Show"} ${title.toLowerCase()}`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 transition-transform duration-200 ease-out group-hover/permission-trigger:translate-x-2 group-focus-visible/permission-trigger:translate-x-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <ShieldCheck className="size-4 text-muted-foreground" />
              {title}
            </div>
            <PermissionSummary permissions={permissions} />
          </div>
          <ChevronDown
            className={
              isOpen
                ? "rotate-180 transition-transform duration-200 ease-out group-hover/permission-trigger:-translate-x-2 group-focus-visible/permission-trigger:-translate-x-2"
                : "transition-transform duration-200 ease-out group-hover/permission-trigger:-translate-x-2 group-focus-visible/permission-trigger:-translate-x-2"
            }
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
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
    <div className="grid gap-6">
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

  const items = getPermissionSummaryItems(permissions)

  if (items.length === 0) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={item} className="inline-flex items-center gap-2">
          {index === 0 ? null : (
            <span
              aria-hidden="true"
              className="size-1 rounded-full bg-current"
            />
          )}
          {item}
        </span>
      ))}
    </div>
  )
}

function getPermissionSummaryItems(permissions: ToolPermission[]) {
  const counts = {
    allowed: 0,
    prompted: 0,
    required: 0,
    blocked: 0,
  }

  for (const permission of permissions) {
    counts[permission.mode] += 1
  }

  return [
    formatPermissionSummaryItem(counts.allowed, "allowed"),
    formatPermissionSummaryItem(counts.prompted, "prompted"),
    formatPermissionSummaryItem(counts.required, "required"),
    formatPermissionSummaryItem(counts.blocked, "blocked"),
  ].filter((item) => item !== null)
}

function formatPermissionSummaryItem(count: number, label: string) {
  return count > 0 ? `${count} ${label}` : null
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
