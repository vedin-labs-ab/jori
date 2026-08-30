import { Link } from "@tanstack/react-router"
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
import { SidebarFolders } from "../folders/section"
import { SidebarUserButton } from "./account"
import { SidebarOrganizationSwitcher } from "./organization"
import {
  type ConsoleSurface,
  consoleNavigation,
  consolePlatformNavigation,
  isNavigationActive,
} from "./routes"

export function ConsoleSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarOrganizationSwitcher />
      </SidebarHeader>
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
        <SidebarFolders pathname={pathname} />
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
      <SidebarFooter>
        <SidebarUserButton />
      </SidebarFooter>
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
            <Link to={item.to}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
