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
import { SurfaceLogo } from "@/console/automations/surfaces/logo"

import { type AutomationPolicyPermissions } from "../../policy"
import { type AutomationSurfaceFormValue } from "../../surfaces"
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="grid grid-cols-[auto_1fr] gap-4 p-6 pb-5 pr-14 text-left">
          <SurfaceLogo className="mt-0.5 size-12" provider={provider} />
          <div className="grid gap-1.5">
            <DialogTitle className="font-semibold text-2xl">
              {providerLabel} tools
            </DialogTitle>
            <DialogDescription className="text-sm/6">
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
      <div className="px-6 pb-6 text-muted-foreground text-sm">
        Loading tool permissions...
      </div>
    )
  }

  if (permissions === null) {
    return (
      <div className="px-6 pb-6 text-muted-foreground text-sm">
        Tool permissions are unavailable right now.
      </div>
    )
  }

  const providerPermissions = permissions.filter(
    (permission) => permission.provider === provider
  )

  if (providerPermissions.length === 0) {
    return (
      <div className="px-6 pb-6 text-muted-foreground text-sm">
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
    <DialogFooter className="mx-6 border-t px-0 py-5 sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <ShieldCheckIcon className="size-5 text-primary" />
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
