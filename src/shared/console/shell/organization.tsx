import { Briefcase, ChevronDown } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** What the sidebar shows of the active organization. */
type OrganizationIdentity = {
  logo?: string
  /** Drawn in place of the logo, where the row stands for no organization. */
  mark?: ReactNode
  name: string
}

/** Compact switcher trigger in the sidebar-10 style: small logo and the
 *  name inline across the sidebar's full width, with the chevron pinned to
 *  the far end. In the icon-collapsed sidebar the button squares off and
 *  shows the logo alone, with the collapsed padding eased so the logo
 *  fits. A skeleton stands in until the organization is known. */
export function SidebarOrganization({
  className,
  organization,
  ...props
}: Omit<ComponentProps<typeof SidebarMenuButton>, "children"> & {
  organization: OrganizationIdentity | undefined
}) {
  return (
    <SidebarMenuButton
      className={cn(
        "px-1.5 group-data-[collapsible=icon]:p-1! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    >
      {organization === undefined ? (
        <OrganizationSkeleton />
      ) : (
        <OrganizationRow organization={organization} />
      )}
      <ChevronDown className="ml-auto size-3.5 group-data-[collapsible=icon]:hidden" />
    </SidebarMenuButton>
  )
}

/** Logo and name, the compact organization row; a nameless one falls
 *  back to a briefcase. */
function OrganizationRow({
  organization,
}: {
  organization: OrganizationIdentity
}) {
  const initials = organization.name.slice(0, 2).toUpperCase()

  return (
    <div className="flex min-w-0 items-center gap-2">
      {organization.mark ?? (
        <Avatar className="size-6 [&_[data-slot=avatar-fallback]]:text-xs">
          <AvatarImage
            alt={organization.name}
            src={logoSource(organization.logo)}
          />
          <AvatarFallback className="text-muted-foreground! text-sm">
            {initials === "" ? <Briefcase className="size-4" /> : initials}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-medium text-foreground text-xs/relaxed">
            {organization.name}
          </p>
        </div>
      </div>
    </div>
  )
}

function OrganizationSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Skeleton className="rounded-md size-6" />
      <div className="flex min-w-0 flex-col gap-1">
        <Skeleton className="w-20 rounded-md h-3" />
      </div>
    </div>
  )
}

/** A blank logo is no logo. */
function logoSource(logo: string | undefined) {
  const trimmed = logo?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}
