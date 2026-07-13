import { useRouterState } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ConsoleHeaderActionsProvider } from "../shared/layout"
import { ConsoleSidebar } from "./navigation"
import { getPageTitle } from "./routes"

const consoleFrame = "w-full px-4 md:px-6"

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const pageTitle = getPageTitle(pathname)
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <ConsoleSidebar pathname={pathname} />
      <SidebarInset className="min-h-0">
        <header
          className={cn(
            consoleFrame,
            "flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
          )}
        >
          <SidebarTrigger className="-ml-1" />
          <Separator
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            orientation="vertical"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div
            className="ml-auto flex items-center gap-2"
            ref={setHeaderSlot}
          />
        </header>
        <ConsoleHeaderActionsProvider slot={headerSlot}>
          <div
            className={cn(
              consoleFrame,
              "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-1 pb-6"
            )}
          >
            {children}
          </div>
        </ConsoleHeaderActionsProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
