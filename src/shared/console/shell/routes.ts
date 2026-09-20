import {
  Cable,
  Database,
  Files,
  Folder,
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
  shortcut?: string
}

type ConsoleGroup = {
  label?: string
  items: readonly ConsoleSurface[]
}

/**
 * The sidebar's structure. New chat and Activity stand alone at the top:
 * the place to ask, then the daily surface, and neither a member of any
 * category. The person's own chats follow them, then "Resources", which
 * lists the jobs, tables, stores, and files that can be filed into folders. The platform
 * group renders at the sidebar's bottom, above the user button —
 * low-frequency setup and reference surfaces earn the quiet slot, not a
 * louder label.
 */
export const consoleNavigation: readonly ConsoleGroup[] = [
  {
    items: [
      {
        icon: Plus,
        label: "New chat",
        to: "/chat",
        shortcut: "n",
        exact: true,
      },
      {
        icon: Timeline,
        label: "Activity",
        to: "/runs",
        shortcut: "a",
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        icon: Workflow,
        label: "Jobs",
        to: "/jobs",
        shortcut: "j",
      },
      {
        icon: Table2,
        label: "Tables",
        to: "/tables",
        shortcut: "t",
      },
      {
        icon: Database,
        label: "Stores",
        to: "/stores",
        shortcut: "s",
      },
      {
        icon: Files,
        label: "Files",
        to: "/files",
        shortcut: "f",
      },
    ],
  },
]

export const consolePlatformNavigation: readonly ConsoleSurface[] = [
  {
    icon: Cable,
    label: "Integrations",
    to: "/integrations",
    shortcut: "i",
  },
  {
    icon: Library,
    label: "Skills",
    to: "/skills",
    shortcut: "k",
  },
  {
    icon: Layers,
    label: "Context",
    to: "/context",
    shortcut: "c",
  },
]

// Surfaces reached from within the sidebar's groups rather than its main
// navigation still need a page title and a document title.
export const folderSurface: ConsoleSurface = {
  icon: Folder,
  label: "Folders",
  to: "/folders",
  shortcut: "o",
}

const secondarySurfaces = [
  { label: "Chat", to: "/chat" },
  folderSurface,
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
  const path = pathname.replace(/\/$/, "")
  return consoleSurfaces.find(
    (item) => item.to in materialNouns && path.startsWith(`${item.to}/`)
  )
}

/** Pages whose header crumb is published by the view once its data loads:
 *  the material detail pages, folder pages, whose whole ancestry is data,
 *  and a conversation's page, named by its title. */
/** New chat is one ask on an otherwise empty page, and a header over it
 *  would only repeat what the sidebar already marks. A conversation keeps
 *  its header: it has a name, and a trail back. */
export function isHeaderless(pathname: string) {
  return pathname.replace(/\/$/, "") === "/chat"
}

export function isMaterialPage(pathname: string) {
  const path = pathname.replace(/\/$/, "")
  return (
    getMaterialSurface(path) !== undefined ||
    path.startsWith("/folders/") ||
    path.startsWith("/chat/")
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
  // Index-route matches include a trailing slash even when the URL does not.
  const path = pathname.replace(/\/$/, "")

  return path === to || (!exact && path.startsWith(`${to}/`))
}

/** A conversation's page, as a typed link the router checks. */
export function conversationDestination(conversationId: string) {
  return { to: "/chat/$conversationId", params: { conversationId } } as const
}

/** The path a conversation's page has, for telling the active one. */
export function conversationPathname(conversationId: string) {
  return `/chat/${conversationId}`
}
