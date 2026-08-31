import {
  Cable,
  CalendarClock,
  Database,
  Files,
  Layers,
  Library,
  ListChecks,
  type LucideIcon,
  Table2,
} from "lucide-react"

export type ConsoleSurface = {
  icon: LucideIcon
  label: string
  to: string
}

type ConsoleGroup = {
  label?: string
  items: readonly ConsoleSurface[]
}

/**
 * The sidebar's structure. Runs stands alone at the top: it is the daily
 * surface, not a member of any category. "Resources" holds exactly the four
 * types that can be filed into folders. The platform group renders at the
 * sidebar's bottom, above the user button — low-frequency setup and
 * reference surfaces earn the quiet slot, not a louder label.
 */
export const consoleNavigation: readonly ConsoleGroup[] = [
  { items: [{ icon: ListChecks, label: "Runs", to: "/runs" }] },
  {
    label: "Resources",
    items: [
      { icon: CalendarClock, label: "Automations", to: "/automations" },
      { icon: Table2, label: "Tables", to: "/tables" },
      { icon: Database, label: "Stores", to: "/stores" },
      { icon: Files, label: "Files", to: "/files" },
    ],
  },
]

export const consolePlatformNavigation: readonly ConsoleSurface[] = [
  { icon: Cable, label: "Integrations", to: "/integrations" },
  { icon: Library, label: "Skills", to: "/skills" },
  { icon: Layers, label: "Context", to: "/context" },
]

// Surfaces reached from within the sidebar's groups rather than its main
// navigation still need a page title and a document title.
const secondarySurfaces = [{ label: "Folders", to: "/folders" }] as const

const consoleSurfaces = [
  ...consoleNavigation.flatMap((group) => group.items),
  ...consolePlatformNavigation,
]

export function getPageTitle(pathname: string) {
  return (
    [...consoleSurfaces, ...secondarySurfaces].find((item) =>
      isNavigationActive(pathname, item.to)
    )?.label ?? "Console"
  )
}

// The material surfaces whose member detail pages live one level below the
// list, so the header names them with a trail instead of a single heading.
const materialSurfacePaths = ["/tables", "/stores", "/files"] as const

/** The surface a material detail page belongs to, when the path is one;
 *  list pages and non-material surfaces stay a single heading. */
export function getMaterialSurface(pathname: string) {
  return consoleSurfaces.find(
    (item) =>
      materialSurfacePaths.some((path) => path === item.to) &&
      pathname.startsWith(`${item.to}/`)
  )
}

/** The organization-wide usage page sits under /folders without being a
 *  folder — no folder id can spell "usage" — so it is named by the same
 *  heading /folders is, not by a crumb no view ever publishes. */
const organizationUsagePath = "/folders/usage"

/** Pages whose header crumb is published by the view once its data loads:
 *  the material detail pages, and folder pages, whose whole ancestry is
 *  data. */
export function isMaterialPage(pathname: string) {
  return (
    getMaterialSurface(pathname) !== undefined ||
    (pathname.startsWith("/folders/") && pathname !== organizationUsagePath)
  )
}

/**
 * What the browser tab says. Console routes declare it from their own path so
 * the name comes from the same table the sidebar and the header read, and a
 * page can never be called one thing in the app and another in history.
 *
 * The page comes first: a tab strip with eight consoles open truncates from
 * the right, and "Runs" is the half worth keeping.
 */
export function consoleDocumentTitle(pathname: string) {
  return `${getPageTitle(pathname)} · Jori`
}

export function isNavigationActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}
