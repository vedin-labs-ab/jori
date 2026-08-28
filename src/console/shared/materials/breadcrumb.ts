import { type Scope } from "@contracts/permissions/scope"
import { createContext, useContext, useEffect } from "react"

// Material detail pages are headed by a breadcrumb trail: the parent
// surface as a link, then the material's name. The console shell owns the
// trail and derives the parent from the path; the detail view publishes
// the name — and optionally the material's scope, shown as a muted icon
// suffix — through this context once its query resolves, so the header
// shows just the linked parent while the name is still loading.

export type MaterialBreadcrumb = {
  name: string
  scope?: Scope
}

export const MaterialBreadcrumbContext = createContext<
  (material: MaterialBreadcrumb | undefined) => void
>(() => undefined)

/** Publish the material's display name, and optionally its scope, to the
 *  console header breadcrumb for as long as the calling detail view is
 *  mounted. */
export function useMaterialBreadcrumb(name: string, scope?: Scope) {
  const publish = useContext(MaterialBreadcrumbContext)

  useEffect(() => {
    publish({ name, scope })

    return () => publish(undefined)
  }, [name, scope, publish])
}
