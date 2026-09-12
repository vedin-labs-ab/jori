"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin
} from "@better-auth-ui/react"
import type { Organization } from "better-auth/client"
import { TriangleAlert } from "lucide-react"
import { useState, type SyntheticEvent } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { OrganizationView } from "./organization-view"

export type DeleteOrganizationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization
}

export function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organization
}: DeleteOrganizationDialogProps) {
  const { authClient, localization } = useAuth()
  const { localization: organizationLocalization } = useAuthPlugin(organizationPlugin)
  const remove = useMutation(api.retention.console.remove)
  const [isPending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await remove({ organizationId: organization.id })
      try {
        await (authClient as OrganizationAuthClient).organization.setActive({
          organizationId: null,
          fetchOptions: { throw: true },
        })
      } finally {
        window.location.assign("/deletion")
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Deletion could not start. Contact support@usejori.com.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlert />
            </AlertDialogMedia>

            <AlertDialogTitle>
              {organizationLocalization.deleteOrganization}
            </AlertDialogTitle>

            <AlertDialogDescription>
              Permanently delete this workspace, including chats, files and connected accounts. Export anything you need first. Cancel your subscription and contact support to refund unused purchased credits before deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Card>
            <CardContent>
              <OrganizationView organization={organization} hideRole />
            </CardContent>
          </Card>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {localization.settings.cancel}
            </AlertDialogCancel>

            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Spinner />}

              {organizationLocalization.deleteOrganization}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
