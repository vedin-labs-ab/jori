import { useMutation, useQuery } from "convex/react"
import { Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "../../../convex/_generated/api"

type PermissionMode = "allowed" | "prompted" | "blocked"
type ToolAccess = "read" | "write"

type ToolPermission = {
  tool: string
  provider: string
  label: string
  description: string
  access: ToolAccess
  defaultMode: PermissionMode
  mode: PermissionMode
  overrideMode: PermissionMode | null
}

const providerLabels: Record<string, string> = {
  milo: "Milo",
  slack: "Slack",
  linear: "Linear",
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  microsoftEmail: "Outlook Mail",
  microsoftCalendar: "Microsoft Calendar",
}

const modeLabels: Record<PermissionMode, string> = {
  allowed: "Allowed",
  prompted: "Prompted",
  blocked: "Blocked",
}

export function PermissionsCard({ tenantId }: { tenantId: string }) {
  const permissions = useQuery(api.permissions.tools.list, { tenantId })
  const setPermission = useMutation(api.permissions.tools.set)
  const [pendingTool, setPendingTool] = useState<string>()
  const [error, setError] = useState<string>()

  async function updatePermission(tool: string, mode: PermissionMode) {
    setPendingTool(tool)
    setError(undefined)

    try {
      await setPermission({ tenantId, tool, mode })
    } catch (updateError) {
      setError(readErrorMessage(updateError))
    } finally {
      setPendingTool(undefined)
    }
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          Permissions
        </CardTitle>
        <CardDescription>
          Control which tools Milo can use for this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PermissionError error={error} />
        <PermissionContent
          permissions={permissions ?? undefined}
          pendingTool={pendingTool}
          onUpdate={updatePermission}
        />
      </CardContent>
    </Card>
  )
}

function PermissionContent({
  permissions,
  pendingTool,
  onUpdate,
}: {
  permissions: ToolPermission[] | null | undefined
  pendingTool: string | undefined
  onUpdate: (tool: string, mode: PermissionMode) => void
}) {
  if (permissions === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading permissions
      </div>
    )
  }

  if (permissions === null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permission access unavailable</AlertTitle>
        <AlertDescription>
          Sign in again to manage tool permissions.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Tool</TableHead>
          <TableHead>Access</TableHead>
          <TableHead>Mode</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.map((permission) => (
          <TableRow key={permission.tool}>
            <TableCell>{providerLabels[permission.provider]}</TableCell>
            <TableCell className="whitespace-normal">
              <div className="grid gap-1">
                <span className="font-medium">{permission.label}</span>
                <span className="text-muted-foreground">
                  {permission.description}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{permission.access}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Select
                  value={permission.mode}
                  onValueChange={(mode) =>
                    onUpdate(permission.tool, mode as PermissionMode)
                  }
                  disabled={pendingTool === permission.tool}
                >
                  <SelectTrigger aria-label={`${permission.label} permission`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getModeOptions(permission.access).map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {modeLabels[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DefaultBadge permission={permission} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DefaultBadge({ permission }: { permission: ToolPermission }) {
  if (permission.overrideMode === null) {
    return <Badge variant="secondary">Default</Badge>
  }

  return <Badge variant="outline">Override</Badge>
}

function PermissionError({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Permission update failed</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}

function getModeOptions(access: ToolAccess): PermissionMode[] {
  if (access === "read") {
    return ["allowed", "blocked"]
  }

  return ["allowed", "prompted", "blocked"]
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not update permission."
}
