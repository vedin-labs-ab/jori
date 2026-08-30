import { Link, useRouterState } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { Fragment, type ReactNode, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { mainContentId, SkipToContent } from "@/shared/skip"
import { FolderDragProvider } from "../folders/drag/context"
import { ConsoleHeaderActionsProvider } from "../shared/layout"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
  type MaterialBreadcrumbSegment,
} from "../shared/materials/breadcrumb"
import { ConsoleSidebar } from "./navigation"
import { getMaterialSurface, getPageTitle } from "./routes"

const consoleFrame = "w-full px-4 md:px-6"

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [material, setMaterial] = useState<MaterialBreadcrumb>()

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <SkipToContent />
      {/* One drag context above both panes, so folder-page rows can drop
          onto the sidebar tree and vice versa. Renders no DOM of its own,
          keeping the provider's flex layout intact. */}
      <FolderDragProvider>
        <ConsoleSidebar pathname={pathname} />
        {/* isolate keeps page z-indexes (sticky table headers, the
            selection bar) inside the inset's own stacking context, so
            full-bleed content can't outpaint the sidebar rail's hover
            strip at the boundary. */}
        {/* outline-none: the inset is the skip link's landing target, and
            the browser's focus ring around the whole content region reads
            as a broken border where the fixed sidebar overlaps it. */}
        <SidebarInset
          className="isolate min-h-0 outline-none"
          id={mainContentId}
          tabIndex={-1}
        >
          {/* Constant compact height in the shadcn dashboard-block style;
              the sidebar-block h-16→h-12 dance made the chrome feel tall
              and shift with sidebar state. */}
          <header
            className={cn(
              consoleFrame,
              "flex h-12 shrink-0 items-center gap-2 border-b"
            )}
          >
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              orientation="vertical"
            />
            <ConsoleHeaderTitle material={material} pathname={pathname} />
            <div
              className="ml-auto flex shrink-0 items-center gap-2"
              ref={setHeaderSlot}
            />
          </header>
          <MaterialBreadcrumbContext.Provider value={setMaterial}>
            <ConsoleHeaderActionsProvider slot={headerSlot}>
              {/* Pages own their padding and scrolling: ConsolePageLayout
                  pads and scrolls, ConsoleListLayout runs full-bleed. */}
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </ConsoleHeaderActionsProvider>
          </MaterialBreadcrumbContext.Provider>
        </SidebarInset>
      </FolderDragProvider>
    </SidebarProvider>
  )
}

/** The header's name for the page. Material detail pages get a trail: the
 *  linked ancestors, then the material's name once its view has published
 *  it — with a muted scope icon suffix when the view publishes a scope.
 *  The ancestors default to the parent surface derived from the path; a
 *  view may publish a full segment trail instead. Everywhere else a
 *  one-item breadcrumb is not a trail, it is the page's name, so it is
 *  marked up as a heading. */
function ConsoleHeaderTitle({
  material,
  pathname,
}: {
  material: MaterialBreadcrumb | undefined
  pathname: string
}) {
  const surface = getMaterialSurface(pathname)
  const trail =
    material?.trail ??
    (surface === undefined
      ? undefined
      : [{ name: surface.label, to: surface.to }])

  if (trail === undefined) {
    return (
      <h1 className="min-w-0 truncate text-xs/relaxed">
        {getPageTitle(pathname)}
      </h1>
    )
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((segment, index) => (
          <Fragment key={segmentKey(segment)}>
            {index === 0 ? null : <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild className="truncate">
                <Link params={segment.params} to={segment.to}>
                  {segment.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        {material === undefined ? null : (
          <>
            {trail.length === 0 ? null : <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0">
              <MaterialName material={material} />
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/** The current material's name — plain, or the trigger of the page's own
 *  menu when the view published one. */
function MaterialName({ material }: { material: MaterialBreadcrumb }) {
  if (material.menu === undefined) {
    return <BreadcrumbPage className="truncate">{material.name}</BreadcrumbPage>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="min-w-0 gap-1 px-1.5 text-foreground"
          type="button"
          variant="ghost"
        >
          <span className="truncate">{material.name}</span>
          <ChevronDown
            aria-hidden
            className="size-3! shrink-0 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      {material.menu}
    </DropdownMenu>
  )
}

function segmentKey(segment: MaterialBreadcrumbSegment) {
  return [segment.to, ...Object.values(segment.params ?? {})].join("/")
}
