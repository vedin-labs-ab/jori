import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react"

// Material detail pages are headed by a breadcrumb trail. The console shell
// owns the trail: by default it derives the linked parent surface from the
// path, and the detail view publishes the material's name through this
// context once its query resolves, so the header shows just the linked
// parent while the name is still loading. Pages whose ancestry is data
// rather than a fixed surface (a nested folder, say) publish the full
// segment trail themselves.

export type MaterialBreadcrumbSegment = {
  name: string
  to: string
  params?: Record<string, string>
}

export type MaterialBreadcrumb = {
  name: string
  /** Ancestor segments, root-first. When present, the header links these
   *  instead of the parent surface it derives from the path. */
  trail?: MaterialBreadcrumbSegment[]
  /** A DropdownMenuContent element. When present, the shell renders the
   *  material's name as the menu's trigger — the page's actions hang off
   *  its own breadcrumb. */
  menu?: ReactNode
  /** A small note about the page rather than a step in its trail — what it
   *  costs, say. The shell hangs it off the end of the trail behind a
   *  divider, outside the breadcrumb's own navigation. */
  aside?: ReactNode
}

export const MaterialBreadcrumbContext = createContext<
  (material: MaterialBreadcrumb | undefined) => void
>(() => undefined)

/** Publish a whole breadcrumb — ancestor segments as links, the material as
 *  the current page. Republishing follows identity, so callers memoize the
 *  material they pass. */
export function useMaterialTrail(material: MaterialBreadcrumb | undefined) {
  const publish = useContext(MaterialBreadcrumbContext)

  useEffect(() => {
    publish(material)

    return () => publish(undefined)
  }, [material, publish])
}

/** Publish the material's display name to the console header breadcrumb
 *  for as long as the calling detail view is mounted. */
export function useMaterialBreadcrumb(name: string, menu?: ReactNode) {
  // A menu element gets a fresh identity per caller render, so it triggers
  // a republish each time — harmless, because the shell's children keep
  // their element identity and bail out of the re-render.
  useMaterialTrail(useMemo(() => ({ name, menu }), [name, menu]))
}
