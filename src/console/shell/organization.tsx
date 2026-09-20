import { useNavigate } from "@tanstack/react-router"
import { type Organization } from "better-auth/client"
import { CircleDashed, Plus, Settings } from "lucide-react"
import { type ComponentProps, useState } from "react"
import { toast } from "sonner"
import { OrganizationView } from "@/components/auth/organization/organization-view"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { billingSearch } from "@/console/billing/actions/return"
import { readOnboarded } from "@/console/onboarding/state"
import { BrandIcon } from "@/shared/brand"
import { RevealArrow } from "@/shared/console/dot"
import { SidebarOrganization } from "@/shared/console/shell/organization"
import { organizationNeutralPath } from "@/shared/console/shell/routes"
import {
  activateOrganization,
  useActiveOrganization,
  useListOrganizations,
} from "@/shared/session/auth"
import { OrganizationDialog } from "./settings"

function billingSettingsRequested() {
  return (
    billingSearch({
      billing: new URL(window.location.href).searchParams.get("billing"),
    }).billing !== undefined
  )
}

/** The organization at the sidebar's head, and the menu it opens: manage
 *  this one, switch to another, or start a new one. Onboarding leaves only
 *  the switching. Onboarding the current organization shows it as usual;
 *  onboarding a new one shows none as chosen, since the one still active
 *  behind it is where the person came from, not where they are. */
export function SidebarOrganizationSwitcher({
  onboarding,
}: {
  onboarding?: "current" | "new"
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()
  const [billingRequested] = useState(billingSettingsRequested)
  const [managing, setManaging] = useState(billingRequested)
  const shown = onboarding === "new" ? undefined : (active.data ?? undefined)
  const others =
    organizations.data?.filter(
      (organization) => organization.id !== shown?.id
    ) ?? []

  // A new organization is left for the console, whichever organization is
  // picked; the one still active needs no activating to go back to.
  async function select(organizationId: string) {
    // The page goes first, so the next organization never opens on a page
    // about something of this one's.
    const path = organizationNeutralPath(window.location.pathname)

    if (onboarding === "new") {
      await navigate({ to: "/chat" })
    } else if (path !== window.location.pathname.replace(/\/$/, "")) {
      await navigate({ to: path })
    }

    if (organizationId !== active.data?.id) {
      await activateOrganization(organizationId)
    }
  }

  return (
    <>
      <OrganizationMenu
        isMobile={isMobile}
        onCreate={
          onboarding === undefined
            ? () => void navigate({ to: "/new" })
            : undefined
        }
        onManage={
          onboarding === undefined ? () => setManaging(true) : undefined
        }
        onSelect={select}
        organizations={others}
        shown={
          onboarding === "new"
            ? {
                mark: <BrandIcon className="size-6" />,
                name: "New organization",
              }
            : shown && { logo: shown.logo ?? undefined, name: shown.name }
        }
      />
      {active.data && onboarding === undefined ? (
        <OrganizationDialog
          initialView={billingRequested ? "billing" : "general"}
          onOpenChange={setManaging}
          open={managing}
          organizationId={active.data.id}
        />
      ) : null}
    </>
  )
}

function OrganizationMenu({
  isMobile,
  onCreate,
  onManage,
  onSelect,
  organizations,
  shown,
}: {
  isMobile: boolean
  /** Left out where starting a new organization is not on offer. */
  onCreate?: () => void
  /** Left out where managing this one is not on offer. */
  onManage?: () => void
  onSelect: (organizationId: string) => Promise<void>
  organizations: Organization[]
  /** What the trigger shows; a skeleton until it is known. */
  shown: ComponentProps<typeof SidebarOrganization>["organization"]
}) {
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const switching = switchingId !== null

  async function switchOrganization(organizationId: string) {
    setSwitchingId(organizationId)

    try {
      await onSelect(organizationId)
    } catch {
      setSwitchingId(null)
      toast.error("Couldn't switch organization. Try again.")
    }
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => !switching && setOpen(nextOpen)}
    >
      <DropdownMenuTrigger asChild>
        <SidebarOrganization
          aria-busy={switching}
          disabled={switching}
          organization={shown}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        aria-busy={switching}
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        {/* The header is there for Manage; without it, it would only
            repeat the trigger. */}
        {onManage === undefined ? null : (
          <>
            <OrganizationMenuHeader onManage={onManage} switching={switching} />
            <DropdownMenuSeparator />
          </>
        )}
        <OrganizationOptions
          onCreate={onCreate}
          onSelect={(id) => void switchOrganization(id)}
          organizations={organizations}
          switchingId={switchingId}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function OrganizationMenuHeader({
  onManage,
  switching,
}: {
  onManage: () => void
  switching: boolean
}) {
  return (
    <DropdownMenuLabel className="p-0 font-normal text-foreground">
      <div className="flex items-center justify-between gap-3 px-1 py-1.5">
        <OrganizationView className="min-w-0 flex-1" hideRole hideSlug />
        <Button
          disabled={switching}
          onClick={onManage}
          size="sm"
          variant="outline"
        >
          <Settings />
          Manage
        </Button>
      </div>
    </DropdownMenuLabel>
  )
}

function OrganizationOptions({
  onCreate,
  onSelect,
  organizations,
  switchingId,
}: {
  onCreate?: () => void
  onSelect: (organizationId: string) => void
  organizations: Organization[]
  switchingId: string | null
}) {
  const switching = switchingId !== null

  return (
    <>
      {organizations.map((organization) => (
        <OrganizationOption
          key={organization.id}
          onSelect={onSelect}
          organization={organization}
          switching={switchingId === organization.id}
          switchingDisabled={switching}
        />
      ))}
      {onCreate === undefined ? null : (
        <>
          {organizations.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem disabled={switching} onSelect={onCreate}>
            <Plus />
            Create organization
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}

function OrganizationOption({
  onSelect,
  organization,
  switching,
  switchingDisabled,
}: {
  onSelect: (organizationId: string) => void
  organization: Organization
  switching: boolean
  switchingDisabled: boolean
}) {
  return (
    <DropdownMenuItem
      className="group/reveal"
      disabled={switchingDisabled}
      onSelect={(event) => {
        event.preventDefault()
        onSelect(organization.id)
      }}
    >
      <OrganizationView
        className="min-w-0 flex-1"
        hideRole
        hideSlug
        organization={organization}
        size="sm"
      />
      {/* Picking it lands in its onboarding, so the row says so, and shows
          where it leads once the row is under the pointer. */}
      {switching || readOnboarded(organization.metadata) ? null : (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
          <CircleDashed aria-hidden className="size-3" />
          Finish setup
          <RevealArrow />
        </span>
      )}
      {switching ? (
        <Spinner
          aria-label={`Switching to ${organization.name}`}
          className="ml-auto size-3.5"
        />
      ) : null}
    </DropdownMenuItem>
  )
}
