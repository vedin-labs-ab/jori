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
import { ProviderLogo } from "@/shared/logo/provider"
import { type JobSurfaceFormValue } from "../../../access"
import { type JobPolicyPermissions } from "../../../access/policy"
import { getJobSurfacePermissions } from "../../../access/tools"
import { JobSurfaceToolGroups } from "./sections"

type JobSurfaceToolsDialogProps = {
  onOpenChange: (open: boolean) => void
  onToolsChange: (tools: string[]) => void
  open: boolean
  permissions: JobPolicyPermissions
  integration: JobSurfaceFormValue["integration"]
  toolSurfaceLabel: string
  tools: string[]
}

export function JobSurfaceToolsDialog({
  onOpenChange,
  onToolsChange,
  open,
  permissions,
  integration,
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
  tools: string[]
}

function JobSurfaceToolsContent({
  onToolsChange,
  permissions,
  integration,
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

  const providerPermissions = getJobSurfacePermissions(integration, permissions)

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
