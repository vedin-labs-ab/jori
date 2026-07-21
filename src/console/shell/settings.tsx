import { Building2, CreditCard, Shield, UserRound, Users } from "lucide-react"
import { lazy, Suspense } from "react"

import { InviteMemberButton } from "@/components/auth/organization/invite-member-dialog"
import { OrganizationPeople } from "@/components/auth/organization/organization-people"
import { OrganizationSettings } from "@/components/auth/organization/organization-settings"
import { AccountSettings } from "@/components/auth/settings/account/account-settings"
import { SecuritySettings } from "@/components/auth/settings/security/security-settings"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsDialog } from "./settings/shell"
import { type SettingsDialogView } from "./settings/types"

const BillingSettings = lazy(() =>
  import("@/console/billing").then((module) => ({
    default: module.BillingSettings,
  }))
)

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AccountSettingsView = "account" | "security"
export type OrganizationSettingsView = "general" | "people" | "billing"

const accountViews = [
  { icon: UserRound, label: "Account", value: "account" },
  { icon: Shield, label: "Security", value: "security" },
] as const satisfies readonly SettingsDialogView<AccountSettingsView>[]

const organizationViews = [
  { icon: Building2, label: "General", value: "general" },
  { icon: Users, label: "People", value: "people" },
  { icon: CreditCard, label: "Billing", value: "billing" },
] as const satisfies readonly SettingsDialogView<OrganizationSettingsView>[]

/** The signed-in member's settings, using the shared settings shell. */
export function AccountDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <SettingsDialog
      description="Manage your account."
      initialView="account"
      navigationLabel="Account settings"
      onOpenChange={onOpenChange}
      open={open}
      views={accountViews}
    >
      {(view) => <AccountSettingsContent view={view} />}
    </SettingsDialog>
  )
}

/** Management for the active organization, using the shared settings shell. */
export function OrganizationDialog({
  initialView = "general",
  organizationId,
  open,
  onOpenChange,
}: SettingsDialogProps & {
  initialView?: OrganizationSettingsView
  organizationId: string
}) {
  return (
    <SettingsDialog
      description="Manage your organization."
      headerAction={(view) =>
        view === "people" ? <InviteMemberButton /> : null
      }
      initialView={initialView}
      navigationLabel="Organization settings"
      onOpenChange={onOpenChange}
      open={open}
      views={organizationViews}
    >
      {(view) => (
        <OrganizationSettingsContent
          organizationId={organizationId}
          view={view}
        />
      )}
    </SettingsDialog>
  )
}

function AccountSettingsContent({ view }: { view: AccountSettingsView }) {
  switch (view) {
    case "account":
      return <AccountSettings className="max-w-2xl" />
    case "security":
      return <SecuritySettings className="max-w-2xl" />
  }
}

function OrganizationSettingsContent({
  organizationId,
  view,
}: {
  organizationId: string
  view: OrganizationSettingsView
}) {
  switch (view) {
    case "general":
      return <OrganizationSettings />
    case "people":
      return <OrganizationPeople />
    case "billing":
      return (
        <Suspense fallback={<Skeleton className="h-56" />}>
          <BillingSettings organizationId={organizationId} />
        </Suspense>
      )
  }
}
