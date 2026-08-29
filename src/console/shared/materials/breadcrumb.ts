import { type Scope } from "@contracts/permissions/scope"
import { createContext, useContext, useEffect, useMemo } from "react"

// Material detail pages are headed by a breadcrumb trail. The console shell
// owns the trail: by default it derives the linked parent surface from the
// path, and the detail view publishes the material's name — and optionally
// its scope, shown as a muted icon suffix — through this context once its
// query resolves, so the header shows just the linked parent while the name
// is still loading. Pages whose ancestry is data rather than a fixed surface
// (a nested folder, say) publish the full segment trail themselves.

export type MaterialBreadcrumbSegment = {
  name: string
  to: string
  params?: Record<string, string>
}

export type MaterialBreadcrumb = {
  name: string
  scope?: Scope
  /** Ancestor segments, root-first. When present, the header links these
   *  instead of the parent surface it derives from the path. */
  trail?: MaterialBreadcrumbSegment[]
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

/** Publish the material's display name, and optionally its scope, to the
 *  console header breadcrumb for as long as the calling detail view is
 *  mounted. */
export function useMaterialBreadcrumb(name: string, scope?: Scope) {
  useMaterialTrail(useMemo(() => ({ name, scope }), [name, scope]))
}
