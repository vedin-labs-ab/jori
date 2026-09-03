import { ChevronDown } from "lucide-react"
import { Fragment, type ReactNode, useRef, useState } from "react"
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
import { ConsoleFiltersProvider } from "../filters/provider"
import { ConsoleHeaderActionsProvider } from "../layout"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
  type MaterialBreadcrumbSegment,
} from "../materials/breadcrumb"
import { SaveIcon, type SaveState } from "../materials/save"
import { ConsoleLink } from "./link"
import { getMaterialSurface, getPageTitle, isMaterialPage } from "./routes"

const consoleFrame = "w-full px-4 md:px-6"

/** The console's chrome around a page: the sidebar it is handed, and the
 *  header — trigger, the page's name or breadcrumb trail, the actions slot
 *  pages portal into — over the page itself. Where the console is arrives
 *  as a prop, so the frame reads nothing from the router.
 *
 *  The frame fills the viewport unless a class says otherwise, carries the
 *  skip link's landing id only when its host hands one in, and leaves the
 *  sidebar's open state to the provider unless the host controls it: a
 *  frame shown inside another page sizes to that page, must not repeat
 *  its landing id, and must not write the member's sidebar preference.
 *
 *  The filter panel's open state is held here too, so it carries across
 *  pages; given a storage key it is remembered between visits. */
export function ConsoleFrame({
  children,
  className,
  contentId,
  filterStorageKey,
  onSidebarOpenChange,
  pathname,
  sidebar,
  sidebarOpen,
}: {
  children: ReactNode
  className?: string
  /** The id the skip link lands on, set by the shell that renders one. */
  contentId?: string
  /** Where the filter panel's open state is kept; left out, it is not. */
  filterStorageKey?: string
  onSidebarOpenChange?: (open: boolean) => void
  pathname: string
  /** Left out, the header opens on the title: there is nothing to toggle. */
  sidebar?: ReactNode
  sidebarOpen?: boolean
}) {
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [material, setMaterial] = useState<MaterialBreadcrumb>()

  return (
    <SidebarProvider
      className={cn("h-svh overflow-hidden", className)}
      onOpenChange={onSidebarOpenChange}
      open={sidebarOpen}
    >
      {sidebar}
      {/* isolate keeps page z-indexes (sticky table headers, the
          selection bar) inside the inset's own stacking context, so
          full-bleed content can't outpaint the sidebar rail's hover
          strip at the boundary. */}
      {/* outline-none: the inset is the skip link's landing target, and
          the browser's focus ring around the whole content region reads
          as a broken border where the fixed sidebar overlaps it. */}
      {/* min-w-0: without it the inset takes its min-content width from
          the page, so a wide grid or a long line of code widens the
          whole pane instead of scrolling inside its own scrollport —
          pushing the header's actions out past the clipped edge. */}
      <SidebarInset
        className="isolate min-h-0 min-w-0 outline-none"
        id={contentId}
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
          {sidebar === undefined ? null : (
            <>
              <SidebarTrigger className="-ml-1" />
              <Separator
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                orientation="vertical"
              />
            </>
          )}
          <ConsoleHeaderTitle material={material} pathname={pathname} />
          <div
            className="ml-auto flex shrink-0 items-center gap-2"
            ref={setHeaderSlot}
          />
        </header>
        <MaterialBreadcrumbContext.Provider value={setMaterial}>
          <ConsoleHeaderActionsProvider slot={headerSlot}>
            <ConsoleFiltersProvider storageKey={filterStorageKey}>
              {/* Pages own their padding and scrolling: ConsolePageLayout
                  pads and scrolls, ConsoleListLayout runs full-bleed. */}
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </ConsoleFiltersProvider>
          </ConsoleHeaderActionsProvider>
        </MaterialBreadcrumbContext.Provider>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** The header's name for the page. Material detail pages get a trail: the
 *  linked ancestors, then the material's name. The ancestors default to
 *  the parent surface derived from the path; a view may publish a full
 *  segment trail instead. Everywhere else a one-item breadcrumb is not a
 *  trail, it is the page's name, so it is marked up as a heading. A view
 *  may hang a small aside off the end, divided from the trail. */
function ConsoleHeaderTitle({
  material,
  pathname,
}: {
  material: MaterialBreadcrumb | undefined
  pathname: string
}) {
  const shown = useShownMaterial(material, pathname)

  if (shown === undefined) {
    // A material page before anything published renders nothing — the
    // trail appears whole rather than assembling in front of the reader.
    return isMaterialPage(pathname) ? null : (
      <h1 className="min-w-0 truncate text-xs/relaxed">
        {getPageTitle(pathname)}
      </h1>
    )
  }

  return (
    <>
      <MaterialTrail
        material={shown.material}
        trail={
          shown.material.trail ??
          (shown.surface === undefined
            ? []
            : [{ name: shown.surface.label, to: shown.surface.to }])
        }
      />
      {/* Beside the trail, never inside it: an aside is a note about the
          page, so a reader walking the breadcrumb's navigation should
          reach the page's ancestry and stop. It draws its own divider,
          once it has something to divide from the trail. */}
      {shown.material.aside}
    </>
  )
}

/** The linked ancestors, then the material itself as the current page. */
function MaterialTrail({
  material,
  trail,
}: {
  material: MaterialBreadcrumb
  trail: MaterialBreadcrumbSegment[]
}) {
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((segment, index) => (
          <Fragment key={segmentKey(segment)}>
            {index === 0 ? null : <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild className="truncate">
                <ConsoleLink params={segment.params} to={segment.to}>
                  {segment.name}
                </ConsoleLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        {trail.length === 0 ? null : <BreadcrumbSeparator />}
        <BreadcrumbItem className="min-w-0">
          <MaterialName material={material} />
          {material.suffix}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

type ShownMaterial = {
  material: MaterialBreadcrumb
  surface: ReturnType<typeof getMaterialSurface>
}

/** The crumb the header shows: the live material when one is published,
 *  else the crumb retained from the previous material page — so moving
 *  between materials keeps the old trail up until the new one is ready
 *  instead of dipping through a half-built middle state. Leaving material
 *  pages drops the retained crumb. */
function useShownMaterial(
  material: MaterialBreadcrumb | undefined,
  pathname: string
): ShownMaterial | undefined {
  const held = useRef<ShownMaterial>(undefined)

  if (material !== undefined) {
    held.current = { material, surface: getMaterialSurface(pathname) }
  } else if (!isMaterialPage(pathname)) {
    held.current = undefined
  }

  return held.current
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
        {/* Zero horizontal padding at rest keeps the breadcrumb's gaps
            optically even; hovering (or opening) grows the padding so the
            ghost background reads as the new edge, with the Button's own
            transition smoothing the shift. The weight is the breadcrumb's,
            not the button's: the name reads as the crumb it replaces. */}
        <Button
          className="min-w-0 gap-1 px-0 font-normal text-foreground hover:px-1.5 focus-visible:px-1.5 aria-expanded:px-1.5"
          type="button"
          variant="ghost"
        >
          {/* A save in flight shimmers the name; the chevron steps aside
              for the save's own glyph while there is one to show. */}
          <span
            className={cn(
              "truncate",
              material.saveStatus === "saving" && "shimmer"
            )}
          >
            {material.name}
          </span>
          {material.saveStatus === undefined ||
          material.saveStatus === "idle" ? (
            <ChevronDown
              aria-hidden
              className="size-3! shrink-0 text-muted-foreground"
            />
          ) : (
            <span aria-hidden className="flex shrink-0 [&_svg]:size-3!">
              <SaveIcon saveStatus={material.saveStatus} />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      {material.menu}
      <SaveAnnouncement saveStatus={material.saveStatus} />
    </DropdownMenu>
  )
}

/** What the glyph says, for those who cannot see it change. A failure
 *  interrupts; a save that landed waits its turn. */
function SaveAnnouncement({ saveStatus }: { saveStatus?: SaveState }) {
  if (saveStatus === undefined || saveStatus === "idle") {
    return null
  }

  return (
    <span
      aria-live={saveStatus === "error" ? "assertive" : "polite"}
      className="sr-only"
    >
      {saveStatus === "error" ? "Couldn't save. Retrying." : null}
      {saveStatus === "saved" ? "Saved" : null}
    </span>
  )
}

function segmentKey(segment: MaterialBreadcrumbSegment) {
  return [segment.to, ...Object.values(segment.params ?? {})].join("/")
}
