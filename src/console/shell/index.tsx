import { Link, useRouterState } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { mainContentId, SkipToContent } from "@/shared/skip"
import { ConsoleHeaderActionsProvider } from "../shared/layout"
import { MaterialBreadcrumbContext } from "../shared/materials/breadcrumb"
import { ConsoleSidebar } from "./navigation"
import { getMaterialSurface, getPageTitle } from "./routes"

const consoleFrame = "w-full px-4 md:px-6"

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [materialName, setMaterialName] = useState<string>()

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <SkipToContent />
      <ConsoleSidebar pathname={pathname} />
      <SidebarInset className="min-h-0" id={mainContentId} tabIndex={-1}>
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
          <ConsoleHeaderTitle materialName={materialName} pathname={pathname} />
          <div
            className="ml-auto flex shrink-0 items-center gap-2"
            ref={setHeaderSlot}
          />
        </header>
        <MaterialBreadcrumbContext.Provider value={setMaterialName}>
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
        </MaterialBreadcrumbContext.Provider>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** The header's name for the page. Material detail pages get a trail: the
 *  parent surface as a link, then the material's name once its view has
 *  published it. Everywhere else a one-item breadcrumb is not a trail, it
 *  is the page's name, so it is marked up as a heading. */
function ConsoleHeaderTitle({
  materialName,
  pathname,
}: {
  materialName: string | undefined
  pathname: string
}) {
  const surface = getMaterialSurface(pathname)

  if (surface === undefined) {
    return (
      <h1 className="min-w-0 truncate text-xs/relaxed">
        {getPageTitle(pathname)}
      </h1>
    )
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={surface.to}>{surface.label}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {materialName === undefined ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">
                {materialName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
