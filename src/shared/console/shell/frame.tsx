import { ChevronDown } from "lucide-react"
import { Fragment, type ReactNode, useCallback, useState } from "react"
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
import {
  getMaterialSurface,
  getPageTitle,
  isHeaderless,
  isMaterialPage,
} from "./routes"

const consoleFrame = "w-full px-4 @3xl/inset:px-6"

/** The console's chrome around a page: the sidebar it is handed, and the
 *  header — the page's name or breadcrumb trail, the actions slot pages
 *  portal into, and on a phone the way into the sidebar — over the page
 *  itself. Where the console is arrives
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
  card = false,
  children,
  className,
  contentId,
  filterStorageKey,
  header,
  heading = "h1",
  onSidebarOpenChange,
  pathname,
  sidebar,
  sidebarOpen,
}: {
  /** Draws the inset as the card it is beside a sidebar, when it stands
   *  alone in the window. */
  card?: boolean
  children: ReactNode
  className?: string
  /** The id the skip link lands on, set by the shell that renders one. */
  contentId?: string
  /** Where the filter panel's open state is kept; left out, it is not. */
  filterStorageKey?: string
  /** Left off, the page has the inset to itself, top to bottom, and names
   *  itself. Left out, the route decides. */
  header?: boolean
  /** Embedded consoles sit under their host section's heading, and as a
   *  section of its page rather than a second main landmark. */
  heading?: "h1" | "h3"
  onSidebarOpenChange?: (open: boolean) => void
  pathname: string
  /** Left out, a phone's header opens on the title: there is nothing to open. */
  sidebar?: ReactNode
  sidebarOpen?: boolean
}) {
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [published, setPublished] = useState<{
    pathname: string
    material: MaterialBreadcrumb | undefined
  }>()
  const setMaterial = useCallback(
    (material: MaterialBreadcrumb | undefined) => {
      setPublished({ pathname, material })
    },
    [pathname]
  )
  const material =
    published?.pathname === pathname ? published.material : undefined

  return (
    <SidebarProvider
      className={cn("h-svh overflow-hidden", card && "bg-sidebar", className)}
      // An embedded console is one of several on its page.
      keyboardShortcut={heading === "h1"}
      onOpenChange={onSidebarOpenChange}
      open={sidebarOpen}
    >
      {sidebar}
      {/* isolate and overflow-hidden keep full-bleed content (sticky
          table headers, the selection bar) inside the inset: in its own
          stacking context, and clipped to its rounded corners. The border
          follows the sidebar's inset variant, so it is drawn only where
          the inset is a card: beside a sidebar, from md up. */}
      {/* outline-none: the inset is the skip link's landing target, and
          the browser's focus ring around the whole content region reads
          as a broken border where the fixed sidebar overlaps it. */}
      {/* min-w-0: without it the inset takes its min-content width from
          the page, so a wide grid or a long line of code widens the
          whole pane instead of scrolling inside its own scrollport —
          pushing the header's actions out past the clipped edge. */}
      {/* @container/inset: the console adapts to the room it has, not to
          the viewport. The same views fill a window in the console and a
          phone-sized box on the landing page, so the header and the page
          gutters ask the inset how wide it is. */}
      <SidebarInset
        aria-label={heading === "h1" ? undefined : "Jori console"}
        as={heading === "h1" ? "main" : "section"}
        className={cn(
          "@container/inset isolate min-h-0 min-w-0 overflow-hidden outline-none md:peer-data-[variant=inset]:border",
          card && "md:m-2 md:rounded-xl md:border md:shadow-sm"
        )}
        id={contentId}
        tabIndex={-1}
      >
        <ConsoleHeader
          hasSidebar={sidebar !== undefined}
          header={header}
          heading={heading}
          material={material}
          onSlot={setHeaderSlot}
          pathname={pathname}
        />
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

/** The header over a page, or what stands in for it. Left out, the route
 *  decides, and a page it leaves without a header is still named for those
 *  who cannot see that it is missing. Either way a phone, whose sidebar is a
 *  sheet, keeps its way into it. */
function ConsoleHeader({
  hasSidebar,
  header,
  heading: Heading,
  material,
  onSlot,
  pathname,
}: {
  hasSidebar: boolean
  header: boolean | undefined
  heading: "h1" | "h3"
  material: MaterialBreadcrumb | undefined
  onSlot: (slot: HTMLElement | null) => void
  pathname: string
}) {
  if (!(header ?? !isHeaderless(pathname))) {
    return (
      <>
        {hasSidebar ? (
          <SidebarTrigger className="absolute top-3 left-3 z-10 md:hidden" />
        ) : null}
        {header === undefined ? (
          <Heading className="sr-only">{getPageTitle(pathname)}</Heading>
        ) : null}
      </>
    )
  }

  return (
    // Constant compact height in the shadcn dashboard-block style; the
    // sidebar-block h-16→h-12 dance made the chrome feel tall and shift
    // with sidebar state.
    <header
      className={cn(
        consoleFrame,
        "flex h-12 shrink-0 items-center gap-2 border-b"
      )}
    >
      {/* The sidebar folds from its own header. A phone has no sidebar on
          screen to do that from, so there the way in stays here. */}
      {hasSidebar ? (
        <>
          <SidebarTrigger className="-ml-1 md:hidden" />
          <Separator
            className="mr-2 data-vertical:h-4 data-vertical:self-auto md:hidden"
            orientation="vertical"
          />
        </>
      ) : null}
      <ConsoleHeaderTitle
        heading={Heading}
        material={material}
        pathname={pathname}
      />
      <div className="ml-auto flex shrink-0 items-center gap-2" ref={onSlot} />
    </header>
  )
}

/** The header's name for the page. Material detail pages get a trail: the
 *  linked ancestors, then the material's name. The ancestors default to
 *  the parent surface derived from the path; a view may publish a full
 *  segment trail instead. Everywhere else a one-item breadcrumb is not a
 *  trail, it is the page's name, so it is marked up as a heading. A view
 *  may hang a small aside off the end, divided from the trail. */
function ConsoleHeaderTitle({
  heading: Heading,
  material,
  pathname,
}: {
  heading: "h1" | "h3"
  material: MaterialBreadcrumb | undefined
  pathname: string
}) {
  const shown =
    material === undefined
      ? undefined
      : { material, surface: getMaterialSurface(pathname) }

  if (shown === undefined) {
    // A material page before anything published renders nothing — the
    // trail appears whole rather than assembling in front of the reader.
    return isMaterialPage(pathname) ? null : (
      <Heading className="min-w-0 truncate text-xs/relaxed">
        {getPageTitle(pathname)}
      </Heading>
    )
  }

  return (
    <>
      <MaterialTrail
        heading={Heading}
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
      {/* A note is the first thing a narrow header gives up: contents
          before commentary. `contents` once there is room, so the aside
          and its divider stay the header's own flex children. */}
      <span className="hidden @2xl/inset:contents">{shown.material.aside}</span>
    </>
  )
}

/** The linked ancestors, then the material itself as the current page.
 *  A narrow inset keeps only the nearest ancestor: where the page sits is
 *  worth the room, the whole way there is not. A phone-width inset keeps
 *  the name alone, since beside three header actions even one ancestor
 *  only fits truncated. The separators go with the ancestors they follow,
 *  so what is left reads as a trail either way. */
function MaterialTrail({
  heading: Heading,
  material,
  trail,
}: {
  heading: "h1" | "h3"
  material: MaterialBreadcrumb
  trail: MaterialBreadcrumbSegment[]
}) {
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((segment, index) => (
          <Fragment key={segmentKey(segment)}>
            {index === 0 ? null : (
              <BreadcrumbSeparator className="@max-2xl/inset:hidden" />
            )}
            <BreadcrumbItem
              className={cn(
                "min-w-0",
                index < trail.length - 1
                  ? "@max-2xl/inset:hidden"
                  : "@max-lg/inset:hidden"
              )}
            >
              <BreadcrumbLink asChild className="truncate">
                <ConsoleLink params={segment.params} to={segment.to}>
                  {segment.name}
                </ConsoleLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        {trail.length === 0 ? null : (
          <BreadcrumbSeparator className="@max-lg/inset:hidden" />
        )}
        <BreadcrumbItem className="min-w-0">
          {/* The current crumb is the page's name, so it is the page's
              heading too, as the plain title is where there is no trail.
              Boxless, so the crumb lays out exactly as it did. */}
          <Heading className="contents">
            <MaterialName material={material} />
          </Heading>
          {material.suffix}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/** The current material's name — plain, or the trigger of the page's own
 *  menu when the view published one. */
function MaterialName({ material }: { material: MaterialBreadcrumb }) {
  const name = <MaterialNameContent material={material} />
  return material.renderName ? material.renderName(name) : name
}

function MaterialNameContent({ material }: { material: MaterialBreadcrumb }) {
  if (material.menu === undefined) {
    return <BreadcrumbPage className="truncate">{material.name}</BreadcrumbPage>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Flush at rest keeps the breadcrumb's gaps optically even. The
            weight is the breadcrumb's, not the button's: the name reads as
            the crumb it replaces. */}
        <Button
          className="max-w-full min-w-0 gap-1 font-normal text-foreground"
          flush
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
            <ChevronDown aria-hidden className="size-3! shrink-0" />
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
