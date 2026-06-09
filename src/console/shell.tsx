import {
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start"
import { Link, useRouterState } from "@tanstack/react-router"
import { Cable, LayoutDashboard, Library } from "lucide-react"
import { type ReactNode } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/sidebar"
import { BrandMark } from "@/shared/brand"
import { IntegrationCallbackAlerts } from "./alerts"

const consoleNavigation = [
  { icon: LayoutDashboard, label: "Console", to: "/console" },
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
    <SidebarProvider>
      <ConsoleSidebar pathname={pathname} />
      <SidebarInset>
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
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pb-6 md:px-6">
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
        <OrganizationSwitcher />
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
        <div className="flex px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <UserButton />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function getPageTitle(pathname: string) {
  return (
    consoleNavigation.find((item) => item.to === pathname)?.label ?? "Console"
  )
}
