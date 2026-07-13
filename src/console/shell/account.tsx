import { SignOutButton, useClerk, useUser } from "@clerk/tanstack-react-start"
import { ChevronsUpDown, LogOut, ShieldUser } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

export function SidebarUserButton() {
  const { isMobile } = useSidebar()
  const { user } = useUser()
  const { openUserProfile } = useClerk()

  if (!user) {
    return <Skeleton className="h-12 w-full rounded-md" />
  }

  const initials = `${user.firstName?.at(0) ?? ""}${user.lastName?.at(0) ?? ""}`
  const name = user.fullName ?? user.username ?? "Account"
  const email = user.primaryEmailAddress?.emailAddress ?? ""
  const fallback = initials || name.at(0)?.toUpperCase() || "?"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <UserAvatar
                alt={`${name}'s avatar`}
                fallback={fallback}
                src={user.imageUrl}
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                {email ? (
                  <span className="truncate text-xs">{email}</span>
                ) : null}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar
                  alt={`${name}'s avatar`}
                  fallback={fallback}
                  src={user.imageUrl}
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  {email ? (
                    <span className="truncate text-xs">{email}</span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() =>
                  openUserProfile({
                    appearance: {
                      elements: {
                        profileSection__connectedAccounts: "!hidden",
                      },
                    },
                  })
                }
              >
                <ShieldUser />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserAvatar({
  alt,
  fallback,
  src,
}: {
  alt: string
  fallback: string
  src: string
}) {
  return (
    <Avatar className="h-8 w-8 rounded-lg">
      <AvatarImage alt={alt} src={src} />
      <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
    </Avatar>
  )
}
