import { Link } from "@tanstack/react-router"
import { ChevronsUpDown, LogOut, ShieldUser } from "lucide-react"
import { useState } from "react"
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
import { useSession } from "@/shared/session/auth"
import { AccountDialog } from "./settings"

export function SidebarUserButton() {
  const { isMobile } = useSidebar()
  const { data: session } = useSession()
  const [managing, setManaging] = useState(false)
  const user = session?.user

  if (user === undefined) {
    return <Skeleton className="h-12 w-full rounded-md" />
  }

  const name = user.name || "Account"
  const email = user.email
  const fallback = name.at(0)?.toUpperCase() ?? "?"
  const identity = (
    <>
      <UserAvatar
        alt={`${name}'s avatar`}
        fallback={fallback}
        src={user.image ?? undefined}
      />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        {email ? <span className="truncate text-xs">{email}</span> : null}
      </div>
    </>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              {identity}
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
                {identity}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setManaging(true)}>
                <ShieldUser />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/auth/sign-out">
                <LogOut />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AccountDialog onOpenChange={setManaging} open={managing} />
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
  src: string | undefined
}) {
  return (
    <Avatar className="h-8 w-8 rounded-lg">
      <AvatarImage alt={alt} src={src} />
      <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
    </Avatar>
  )
}
