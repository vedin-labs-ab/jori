import { type ReactNode } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { scrollFade } from "@/shared/fade"
import { ConsoleLink } from "./link"
import {
  type ConsoleSurface,
  consoleNavigation,
  consolePlatformNavigation,
  isNavigationActive,
} from "./routes"

/** The console's sidebar: the workspace navigation, the folder tree, and
 *  the platform group in the quiet bottom slot, between the organization
 *  at its head and the account in its footer. The three parts that know
 *  who is signed in arrive as slots. */
export function ConsoleSidebar({
  account,
  folders,
  organization,
  pathname,
}: {
  account: ReactNode
  folders: ReactNode
  organization: ReactNode
  pathname: string
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>{organization}</SidebarHeader>
      <SidebarContent className={scrollFade}>
        {consoleNavigation.map((group, index) => (
          <SidebarGroup key={group.label ?? index}>
            {group.label === undefined ? null : (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <NavigationMenu items={group.items} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {folders}
        {/* The quiet bottom slot (mt-auto): low-frequency setup and
            reference surfaces, above the user button. */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <NavigationMenu
              items={consolePlatformNavigation}
              pathname={pathname}
              size="sm"
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{account}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavigationMenu({
  items,
  pathname,
  size = "default",
}: {
  items: readonly ConsoleSurface[]
  pathname: string
  size?: "default" | "sm"
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            isActive={isNavigationActive(pathname, item.to)}
            size={size}
            tooltip={item.label}
          >
            <ConsoleLink to={item.to}>
              <item.icon />
              <span>{item.label}</span>
            </ConsoleLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
