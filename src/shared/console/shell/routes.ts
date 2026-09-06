import {
  Cable,
  Database,
  Files,
  Layers,
  Library,
  type LucideIcon,
  Plus,
  Table2,
  Timeline,
  Workflow,
} from "lucide-react"

export type ConsoleSurface = {
  icon: LucideIcon
  label: string
  to: string
  /** Active on the path itself alone, not on the pages under it. */
  exact?: boolean
}

type ConsoleGroup = {
  label?: string
  items: readonly ConsoleSurface[]
}

/**
 * The sidebar's structure. New chat and Activity stand alone at the top:
 * the place to ask, then the daily surface, and neither a member of any
 * category. The person's own chats follow them, then "Resources", which
 * holds exactly the four types that can be filed into folders. The platform
 * group renders at the sidebar's bottom, above the user button —
 * low-frequency setup and reference surfaces earn the quiet slot, not a
 * louder label.
 */
export const consoleNavigation: readonly ConsoleGroup[] = [
  {
    items: [
      { icon: Plus, label: "New chat", to: "/chat", exact: true },
      { icon: Timeline, label: "Activity", to: "/runs" },
    ],
  },
  {
    label: "Resources",
    items: [
      { icon: Workflow, label: "Jobs", to: "/jobs" },
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
const secondarySurfaces = [
  { label: "Chat", to: "/chat" },
  { label: "Folders", to: "/folders" },
] as const

const consoleSurfaces = [
  ...consoleNavigation.flatMap((group) => group.items),
  ...consolePlatformNavigation,
]

export function getPageTitle(pathname: string) {
  return (
    [...consoleSurfaces, ...secondarySurfaces].find((item) =>
      isNavigationActive(pathname, item.to, "exact" in item && item.exact)
    )?.label ?? "Console"
  )
}

// The surfaces whose member detail pages live one level below the list,
// so the header names them with a trail instead of a single heading, each
// with the noun a tab wears before the member's own name has loaded.
const materialNouns: Record<string, string> = {
  "/files": "File",
  "/jobs": "Job",
  "/stores": "Store",
  "/tables": "Table",
}

/** The surface a material detail page belongs to, when the path is one;
 *  list pages and non-material surfaces stay a single heading. */
export function getMaterialSurface(pathname: string) {
  return consoleSurfaces.find(
    (item) => item.to in materialNouns && pathname.startsWith(`${item.to}/`)
  )
}

/** Pages whose header crumb is published by the view once its data loads:
 *  the material detail pages, folder pages, whose whole ancestry is data,
 *  and a conversation's page, named by its title. */
export function isMaterialPage(pathname: string) {
  return (
    getMaterialSurface(pathname) !== undefined ||
    pathname.startsWith("/folders/") ||
    pathname.startsWith("/chat/")
  )
}

/**
 * What the browser tab says. Console routes declare it from their own path so
 * the name comes from the same table the sidebar and the header read, and a
 * page can never be called one thing in the app and another in history.
 *
 * The page comes first: a tab strip with eight consoles open truncates from
 * the right, and "Activity" is the half worth keeping.
 */
export function consoleDocumentTitle(pathname: string) {
  const surface = getMaterialSurface(pathname)
  const page =
    surface === undefined ? getPageTitle(pathname) : materialNouns[surface.to]

  return `${page} · Jori`
}

export function isNavigationActive(
  pathname: string,
  to: string,
  exact = false
) {
  return pathname === to || (!exact && pathname.startsWith(`${to}/`))
}

/** A conversation's page, as a typed link the router checks. */
export function conversationDestination(conversationId: string) {
  return { to: "/chat/$conversationId", params: { conversationId } } as const
}

/** The path a conversation's page has, for telling the active one. */
export function conversationPathname(conversationId: string) {
  return `/chat/${conversationId}`
}
