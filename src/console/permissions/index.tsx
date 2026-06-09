import { ChevronDown, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BrandIcon } from "@/shared/brand"
import { IntegrationSurface } from "../integrations/surface"
import { LoadingMessage } from "../loading"
import {
  type PermissionMode,
  type ToolAccess,
  type ToolPermission,
  type ToolPermissionController,
  type ToolProvider,
} from "./controller"

const modeLabels: Record<PermissionMode, string> = {
  allowed: "Allowed",
  prompted: "Prompted",
  blocked: "Blocked",
}

const modeOptions: Record<ToolAccess, PermissionMode[]> = {
  read: ["allowed", "blocked"],
  write: ["allowed", "prompted", "blocked"],
}

export function IntegrationPermissions({
  controller,
  provider,
}: {
  controller: ToolPermissionController
  provider: Exclude<ToolProvider, "milo">
}) {
  return (
    <PermissionSection
      controller={controller}
      emptyLabel="No provider permissions are defined yet."
      provider={provider}
      title="Permissions"
    />
  )
}

export function NativePermissionsCard({
  controller,
}: {
  controller: ToolPermissionController
}) {
  return (
    <IntegrationSurface
      description="Control built-in scheduling permissions for this tenant."
      logo={{ mark: <BrandIcon className="size-7" /> }}
      title="Milo tools"
    >
      <PermissionSection
        controller={controller}
        emptyLabel="No tenant tool permissions are defined yet."
        provider="milo"
        title="Permissions"
      />
    </IntegrationSurface>
  )
}

function PermissionSection({
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
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ShieldCheck className="size-4 text-muted-foreground" />
          {title}
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
    <div className="grid gap-3">
      <ProviderPermissionError
        error={controller.error}
        permissions={permissions}
      />
      <div className="divide-y divide-border/80">
        {permissions.map((permission) => (
          <PermissionRow
            key={permission.tool}
            onUpdate={controller.updatePermission}
            pendingTool={controller.pendingTool}
            permission={permission}
          />
        ))}
      </div>
    </div>
  )
}

function PermissionRow({
  onUpdate,
  pendingTool,
  permission,
}: {
  onUpdate: (tool: string, mode: PermissionMode) => void
  pendingTool: string | undefined
  permission: ToolPermission
}) {
  return (
    <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(9rem,1fr)_minmax(12rem,1.6fr)_auto] sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium text-sm">{permission.label}</div>
        <Badge
          className="h-5 rounded-md px-2 text-[0.6875rem]"
          variant="outline"
        >
          {permission.access}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        {permission.description}
      </div>
      <Select
        value={permission.mode}
        onValueChange={(mode) =>
          onUpdate(permission.tool, mode as PermissionMode)
        }
        disabled={pendingTool === permission.tool}
      >
        <SelectTrigger
          aria-label={`${permission.label} permission`}
          className="w-28 justify-self-start sm:justify-self-end"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modeOptions[permission.access].map((mode) => (
            <SelectItem key={mode} value={mode}>
              {modeLabels[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
