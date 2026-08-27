import {
  Cable,
  CalendarClock,
  Database,
  Files,
  Layers,
  Library,
  ListChecks,
  Table2,
} from "lucide-react"

export const consoleNavigation = [
  { icon: ListChecks, label: "Runs", to: "/runs" },
  { icon: CalendarClock, label: "Automations", to: "/automations" },
  { icon: Table2, label: "Tables", to: "/tables" },
  { icon: Database, label: "Stores", to: "/stores" },
  { icon: Files, label: "Files", to: "/files" },
  { icon: Cable, label: "Integrations", to: "/integrations" },
  { icon: Library, label: "Skills", to: "/skills" },
  { icon: Layers, label: "Context", to: "/context" },
] as const

export function getPageTitle(pathname: string) {
  return (
    consoleNavigation.find((item) => isNavigationActive(pathname, item.to))
      ?.label ?? "Console"
  )
}

// The material surfaces whose member detail pages live one level below the
// list, so the header names them with a trail instead of a single heading.
const materialSurfacePaths = ["/tables", "/stores", "/files"] as const

/** The surface a material detail page belongs to, when the path is one;
 *  list pages and non-material surfaces stay a single heading. */
export function getMaterialSurface(pathname: string) {
  return consoleNavigation.find(
    (item) =>
      materialSurfacePaths.some((path) => path === item.to) &&
      pathname.startsWith(`${item.to}/`)
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
