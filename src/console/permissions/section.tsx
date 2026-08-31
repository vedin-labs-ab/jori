import { ChevronDown, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { LoadingMessage } from "@/shared/loading"
import { SeparatorDot } from "../shared/dot"
import { flushRowClassName } from "../shared/flush"
import { type ToolPermissionController } from "./controller"
import { PermissionRow } from "./row"
import {
  type ConfigurablePermissionMode,
  type ToolAccess,
  type ToolPermission,
  type ToolSurface,
} from "./types"

export function PermissionSection({
  controller,
  emptyLabel,
  surface,
  title,
}: {
  controller: ToolPermissionController
  emptyLabel: string
  surface: ToolSurface
  title: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const permissions = controller.getSurfacePermissions(surface)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={flushRowClassName(
            "group/permission-trigger min-h-7 justify-between py-1.5 text-left whitespace-normal [&[aria-expanded=true]:not(:hover)]:bg-transparent"
          )}
          aria-label={`${isOpen ? "Hide" : "Show"} ${title.toLowerCase()}`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <ShieldCheck className="size-4 text-muted-foreground" />
              {title}
            </div>
            <PermissionSummary permissions={permissions} />
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-200 ease-out",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <PermissionContent
          controller={controller}
          emptyLabel={emptyLabel}
          surface={surface}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}

function PermissionContent({
  controller,
  emptyLabel,
  surface,
}: {
  controller: ToolPermissionController
  emptyLabel: string
  surface: ToolSurface
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

  const permissions = controller.getSurfacePermissions(surface)

  if (permissions.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="grid gap-6">
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
          {index === 0 ? null : <SeparatorDot />}
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
    formatPermissionSummaryItem(counts.prompted, "ask first"),
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
