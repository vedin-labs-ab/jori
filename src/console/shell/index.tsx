import {
  OrganizationSwitcher,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useClerk,
  useUser,
} from "@clerk/tanstack-react-start"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  Cable,
  CalendarClock,
  ChevronsUpDown,
  Component,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  NotebookTabs,
  ShieldUser,
} from "lucide-react"
import { type ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandMark } from "@/shared/brand"
import { IntegrationCallbackAlerts } from "../integrations/callback/alerts"

const consoleNavigation = [
  { icon: LayoutDashboard, label: "Overview", to: "/console" },
  { icon: ListChecks, label: "Runs", to: "/executions" },
  { icon: NotebookTabs, label: "Playbooks", to: "/playbooks" },
  { icon: CalendarClock, label: "Automations", to: "/automations" },
  { icon: Component, label: "Artifacts", to: "/artifacts" },
  { icon: Cable, label: "Integrations", to: "/integrations" },
  { icon: Library, label: "Skills", to: "/skills" },
] as const

export function PublicConsoleFrame({
  children,
  isLoaded,
  isSignedIn,
}: {
  children: ReactNode
  isLoaded: boolean
  isSignedIn: boolean | undefined
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <PublicConsoleHeader isLoaded={isLoaded} isSignedIn={isSignedIn} />
      <IntegrationCallbackAlerts />
      {children}
    </main>
  )
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const pageTitle = getPageTitle(pathname)

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <ConsoleSidebar pathname={pathname} />
      <SidebarInset className="min-h-0">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto px-4 pt-1 pb-6 md:px-6">
          <IntegrationCallbackAlerts />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function PublicConsoleHeader({
  isLoaded,
  isSignedIn,
}: {
  isLoaded: boolean
  isSignedIn: boolean | undefined
}) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <BrandMark />

      <div className="ml-auto flex items-center gap-2">
        {!isLoaded ? (
          <Button variant="outline" size="sm" disabled>
            Loading
          </Button>
        ) : null}
        {isLoaded && !isSignedIn ? (
          <>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </>
        ) : null}
        {isLoaded && isSignedIn ? <UserButton /> : null}
      </div>
    </header>
  )
}

function ConsoleSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarOrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {consoleNavigation.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to}
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

function SidebarOrganizationSwitcher() {
  return (
    <OrganizationSwitcher
      appearance={{
        elements: {
          rootBox: "!w-full",
          avatarBox: "!size-8",
          organizationPreview: "!gap-2",
          organizationPreviewAvatarBox: "!bg-transparent",
          organizationPreviewMainIdentifier: "!text-foreground",
          organizationSwitcherTrigger:
            "!h-12 !w-full !justify-between !rounded-[calc(var(--radius-sm)+2px)] !px-2 !text-xs transition-[width,height,padding] !duration-200 !ease-linear hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground focus-visible:!ring-2 focus-visible:!ring-sidebar-ring group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0",
          organizationSwitcherTriggerIcon:
            "group-data-[collapsible=icon]:!hidden",
        },
      }}
    />
  )
}

function SidebarUserButton() {
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
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
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
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
    </Avatar>
  )
}

function getPageTitle(pathname: string) {
  return (
    consoleNavigation.find((item) => item.to === pathname)?.label ?? "Console"
  )
}
