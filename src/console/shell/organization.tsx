import { ChevronsUpDown } from "lucide-react"
import { OrganizationSwitcher } from "@/components/auth/organization/organization-switcher"
import { OrganizationView } from "@/components/auth/organization/organization-view"
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { activateOrganization } from "@/shared/session/auth"

export function SidebarOrganizationSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal
      setActive={(organization) => {
        if (organization !== null) {
          void activateOrganization(organization.id)
        }
      }}
      trigger={
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            size="lg"
          >
            <OrganizationView className="min-w-0 flex-1" hideRole hideSlug />
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
      }
    />
  )
}
