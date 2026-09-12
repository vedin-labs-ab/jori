import { ChevronsUpDown, LogOut, ShieldUser, SunMoon } from "lucide-react"
import { useState } from "react"
import { useSignOutFlow } from "@/components/auth/sign-out"
import { UserView } from "@/components/auth/user/user-view"
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
import { usePrivacyChoices } from "@/shared/analytics/context"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { useSession } from "@/shared/session/auth"
import { AccountDialog, type AccountSettingsView } from "./settings"

export function SidebarUserButton() {
  const { isMobile } = useSidebar()
  const { data: session } = useSession()
  const [managing, setManaging] = useState<AccountSettingsView>()
  const signOut = useSignOutFlow()
  const privacy = usePrivacyChoices()
  const user = session?.user

  if (signOut.isSigningOut) {
    return <FullscreenSkeletonLoader />
  }

  if (user === undefined) {
    return <Skeleton className="h-12 w-full rounded-md" />
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <UserView className="flex-1" user={user} />
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
              <UserView className="px-1 py-1.5" user={user} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setManaging("account")}>
                <ShieldUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setManaging("appearance")}>
                <SunMoon />
                Appearance
              </DropdownMenuItem>
              {privacy === undefined ? null : (
                <DropdownMenuItem onSelect={privacy.open}>
                  Privacy choices
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut.signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AccountDialog
          initialView={managing}
          onOpenChange={(open) => {
            if (!open) {
              setManaging(undefined)
            }
          }}
          open={managing !== undefined}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
