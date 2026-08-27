import { createContext, useContext, useEffect } from "react"

// Material detail pages are headed by a breadcrumb trail: the parent
// surface as a link, then the material's name. The console shell owns the
// trail and derives the parent from the path; the detail view publishes
// the name through this context once its query resolves, so the header
// shows just the linked parent while the name is still loading.

export const MaterialBreadcrumbContext = createContext<
  (name: string | undefined) => void
>(() => undefined)

/** Publish the material's display name to the console header breadcrumb
 *  for as long as the calling detail view is mounted. */
export function useMaterialBreadcrumb(name: string) {
  const publish = useContext(MaterialBreadcrumbContext)

  useEffect(() => {
    publish(name)

    return () => publish(undefined)
  }, [name, publish])
}
