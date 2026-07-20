import { ChevronsUpDown, Plus, Settings } from "lucide-react"
import { useState } from "react"
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
import { SidebarMenuButton } from "@/components/ui/sidebar"
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            size="lg"
          >
            <OrganizationView className="min-w-0 flex-1" hideRole hideSlug />
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 rounded-lg">
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center justify-between gap-4 px-2 py-2">
              <OrganizationView className="min-w-0" hideRole hideSlug />
              <Button
                onClick={() => setManaging(true)}
                size="sm"
                variant="outline"
              >
                <Settings className="text-muted-foreground" />
                Manage
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {others.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              onSelect={() => void activateOrganization(organization.id)}
            >
              <OrganizationView
                className="min-w-0"
                hideRole
                hideSlug
                organization={organization}
                size="sm"
              />
            </DropdownMenuItem>
          ))}
          {others.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
