import { type Organization } from "better-auth/client"
import { ChevronsUpDown, Plus, Settings } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CreateOrganizationDialog } from "@/components/auth/organization/create-organization-dialog"
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
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import {
  activateOrganization,
  useActiveOrganization,
  useListOrganizations,
} from "@/shared/session/auth"
import { OrganizationDialog } from "./settings"

function billingSettingsRequested() {
  return new URL(window.location.href).searchParams.has("billing")
}

export function SidebarOrganizationSwitcher() {
  const { isMobile } = useSidebar()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()
  const [billingRequested] = useState(billingSettingsRequested)
  const [managing, setManaging] = useState(billingRequested)
  const [creating, setCreating] = useState(false)
  const others =
    organizations.data?.filter(
      (organization) => organization.id !== active.data?.id
    ) ?? []

  return (
    <>
      <OrganizationMenu
        isMobile={isMobile}
        onCreate={() => setCreating(true)}
        onManage={() => setManaging(true)}
        organizations={others}
      />
      {active.data ? (
        <OrganizationDialog
          initialView={billingRequested ? "billing" : "general"}
          onOpenChange={setManaging}
          open={managing}
          organizationId={active.data.id}
        />
      ) : null}
      <CreateOrganizationDialog onOpenChange={setCreating} open={creating} />
    </>
  )
}

function OrganizationMenu({
  isMobile,
  onCreate,
  onManage,
  organizations,
}: {
  isMobile: boolean
  onCreate: () => void
  onManage: () => void
  organizations: Organization[]
}) {
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const switching = switchingId !== null

  async function switchOrganization(organizationId: string) {
    setSwitchingId(organizationId)

    try {
      await activateOrganization(organizationId)
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
      <OrganizationMenuTrigger switching={switching} />
      <DropdownMenuContent
        align="start"
        aria-busy={switching}
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <OrganizationMenuHeader onManage={onManage} switching={switching} />
        <DropdownMenuSeparator />
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

function OrganizationMenuTrigger({ switching }: { switching: boolean }) {
  return (
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton
        aria-busy={switching}
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        disabled={switching}
        size="lg"
      >
        <OrganizationView className="min-w-0 flex-1" hideRole hideSlug />
        <ChevronsUpDown className="ml-auto size-4" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
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
    <DropdownMenuLabel className="p-0 font-normal">
      <div className="flex items-center justify-between gap-3 px-1 py-1.5">
        <OrganizationView className="min-w-0 flex-1" hideRole hideSlug />
        <Button
          disabled={switching}
          onClick={onManage}
          size="sm"
          variant="outline"
        >
          <Settings className="text-muted-foreground" />
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
  onCreate: () => void
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
      {organizations.length > 0 ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem disabled={switching} onSelect={onCreate}>
        <Plus />
        Create organization
      </DropdownMenuItem>
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
      {switching ? (
        <Spinner
          aria-label={`Switching to ${organization.name}`}
          className="ml-auto size-3.5"
        />
      ) : null}
    </DropdownMenuItem>
  )
}
