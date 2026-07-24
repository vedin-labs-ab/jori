import { Building2, CreditCard, Shield, UserRound, Users } from "lucide-react"
import { lazy, Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { SettingsDialog } from "./settings/shell"
import { type SettingsDialogView } from "./settings/types"

// Settings views only render once a dialog opens, so they load then too. The
// account and organization surfaces are the console's largest views, and
// every page carries the sidebar that can open them.
const AccountSettings = lazy(() =>
  import("@/components/auth/settings/account/account-settings").then(
    (module) => ({ default: module.AccountSettings })
  )
)
const BillingSettings = lazy(() =>
  import("@/console/billing").then((module) => ({
    default: module.BillingSettings,
  }))
)
const InviteMemberButton = lazy(() =>
  import("@/components/auth/organization/invite-member-dialog").then(
    (module) => ({ default: module.InviteMemberButton })
  )
)
const OrganizationPeople = lazy(() =>
  import("@/components/auth/organization/organization-people").then(
    (module) => ({ default: module.OrganizationPeople })
  )
)
const OrganizationSettings = lazy(() =>
  import("@/components/auth/organization/organization-settings").then(
    (module) => ({ default: module.OrganizationSettings })
  )
)
const SecuritySettings = lazy(() =>
  import("@/components/auth/settings/security/security-settings").then(
    (module) => ({ default: module.SecuritySettings })
  )
)

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AccountSettingsView = "account" | "security"
type OrganizationSettingsView = "general" | "people" | "billing"

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
      {(view) => (
        <Suspense fallback={<Skeleton className="h-56" />}>
          <AccountSettingsContent view={view} />
        </Suspense>
      )}
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
        view === "people" ? (
          <Suspense fallback={null}>
            <InviteMemberButton />
          </Suspense>
        ) : null
      }
      initialView={initialView}
      navigationLabel="Organization settings"
      onOpenChange={onOpenChange}
      open={open}
      views={organizationViews}
    >
      {(view) => (
        <Suspense fallback={<Skeleton className="h-56" />}>
          <OrganizationSettingsContent
            organizationId={organizationId}
            view={view}
          />
        </Suspense>
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
      return <BillingSettings organizationId={organizationId} />
  }
}
