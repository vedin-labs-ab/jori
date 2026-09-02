import { ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type JobSurfaceFormValue } from "@/shared/console/jobs/access"
import { type JobPolicyPermissions } from "@/shared/console/jobs/access/policy"
import { ProviderLogo } from "@/shared/logo/provider"
import { JobSurfaceToolGroups } from "./sections"

type JobSurfaceToolsDialogProps = {
  onOpenChange: (open: boolean) => void
  onToolsChange: (tools: string[]) => void
  open: boolean
  permissions: JobPolicyPermissions
  integration: JobSurfaceFormValue["integration"]
  organizationId: string
  toolSurfaceLabel: string
  tools: string[]
}

export function JobSurfaceToolsDialog({
  onOpenChange,
  onToolsChange,
  open,
  permissions,
  integration,
  organizationId,
  toolSurfaceLabel,
  tools,
}: JobSurfaceToolsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="grid grid-cols-[auto_1fr] gap-3 pr-8 text-left">
          <ProviderLogo className="mt-0.5 size-6" surface={integration} />
          <div className="grid gap-1">
            <DialogTitle>{toolSurfaceLabel} tools</DialogTitle>
            <DialogDescription>
              Choose the exact tools this job can use.
            </DialogDescription>
          </div>
        </DialogHeader>
        <JobSurfaceToolsContent
          onToolsChange={onToolsChange}
          permissions={permissions}
          integration={integration}
          organizationId={organizationId}
          tools={tools}
        />
      </DialogContent>
    </Dialog>
  )
}

type JobSurfaceToolsContentProps = {
  onToolsChange: (tools: string[]) => void
  permissions: JobPolicyPermissions
  integration: JobSurfaceFormValue["integration"]
  organizationId: string
  tools: string[]
}

function JobSurfaceToolsContent({
  onToolsChange,
  permissions,
  integration,
  organizationId,
  tools,
}: JobSurfaceToolsContentProps) {
  if (permissions === undefined) {
    return (
      <div className="text-muted-foreground text-sm">
        Loading tool permissions...
      </div>
    )
  }

  if (permissions === null) {
    return (
      <div className="text-muted-foreground text-sm">
        Tool permissions are unavailable right now.
      </div>
    )
  }

  const providerPermissions = permissions.filter(
    (permission) => permission.surface === integration
  )

  if (providerPermissions.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        This integration does not expose configurable tools yet.
      </div>
    )
  }

  return (
    <>
      <JobSurfaceToolGroups
        onToolsChange={onToolsChange}
        permissions={providerPermissions}
        organizationId={organizationId}
        tools={tools}
      />
      <JobSurfaceToolsFooter />
    </>
  )
}

function JobSurfaceToolsFooter() {
  return (
    <DialogFooter className="sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <ShieldCheckIcon className="size-4 text-primary" />
        <span>You can change these anytime.</span>
      </div>
      <DialogClose asChild>
        <Button type="button" variant="outline">
          Close
        </Button>
      </DialogClose>
    </DialogFooter>
  )
}
