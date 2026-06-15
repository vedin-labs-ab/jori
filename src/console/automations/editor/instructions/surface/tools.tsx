import { AlertCircleIcon, ShieldCheckIcon } from "lucide-react"

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
import { type AutomationSurfaceFormValue } from "../../../surface"
import { SurfaceLogo } from "../../../surface/logo"
import { type AutomationPolicyPermissions } from "../../../surface/policy"
import { AutomationSurfaceToolGroups } from "./sections"

type AutomationSurfaceToolsDialogProps = {
  onOpenChange: (open: boolean) => void
  onToolsChange: (tools: string[]) => void
  open: boolean
  permissions: AutomationPolicyPermissions
  provider: AutomationSurfaceFormValue["provider"]
  providerLabel: string
  tools: string[]
}

export function AutomationSurfaceToolsDialog({
  onOpenChange,
  onToolsChange,
  open,
  permissions,
  provider,
  providerLabel,
  tools,
}: AutomationSurfaceToolsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="grid grid-cols-[auto_1fr] gap-3 pr-8 text-left">
          <SurfaceLogo className="mt-0.5 size-6" provider={provider} />
          <div className="grid gap-1">
            <DialogTitle>{providerLabel} tools</DialogTitle>
            <DialogDescription>
              Choose the exact tools this automation can use.
            </DialogDescription>
          </div>
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

type AutomationSurfaceToolsContentProps = {
  onToolsChange: (tools: string[]) => void
  permissions: AutomationPolicyPermissions
  provider: AutomationSurfaceFormValue["provider"]
  tools: string[]
}

function AutomationSurfaceToolsContent({
  onToolsChange,
  permissions,
  provider,
  tools,
}: AutomationSurfaceToolsContentProps) {
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
    (permission) => permission.provider === provider
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
      <AutomationSurfaceToolGroups
        onToolsChange={onToolsChange}
        permissions={providerPermissions}
        tools={tools}
      />
      <AutomationSurfaceToolsFooter />
    </>
  )
}

function AutomationSurfaceToolsFooter() {
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

export type AutomationSurfaceWithTools = AutomationSurfaceFormValue & {
  tools: string[]
}

export function MissingToolPermissionsMessage({
  providerLabel,
}: {
  providerLabel: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
      <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
      <p>
        Some {providerLabel} tools are no longer allowed for this integration.
        Update this automation before saving.
      </p>
    </div>
  )
}
