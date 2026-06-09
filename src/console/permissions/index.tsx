import { ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          Milo tools
        </CardTitle>
        <CardDescription>
          Control built-in scheduling permissions that are not tied to an
          external integration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PermissionSection
          controller={controller}
          emptyLabel="No native tool permissions are defined yet."
          provider="milo"
          title="Permissions"
        />
      </CardContent>
    </Card>
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
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ShieldCheck className="size-4 text-muted-foreground" />
          {title}
        </div>
        <Badge variant="outline">{permissions.length} tools</Badge>
      </div>
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
    </section>
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
    <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(8rem,1fr)_minmax(12rem,1.6fr)_auto_auto] sm:items-center">
      <div className="grid gap-0.5">
        <div className="font-medium text-sm">{permission.label}</div>
        <DefaultLabel permission={permission} />
      </div>
      <div className="text-xs text-muted-foreground">
        {permission.description}
      </div>
      <Badge
        className="h-6 w-fit justify-self-start rounded-md px-2.5 text-xs"
        variant="outline"
      >
        {permission.access}
      </Badge>
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

function DefaultLabel({ permission }: { permission: ToolPermission }) {
  if (permission.overrideMode !== null) {
    return (
      <span className="text-[0.6875rem] text-muted-foreground">Custom</span>
    )
  }

  return <span className="text-[0.6875rem] text-muted-foreground">Default</span>
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
