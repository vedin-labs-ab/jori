/**
 * Stand-ins for TanStack Router's hooks, for component tests that render
 * console views without mounting a router. `useRouter().buildLocation`
 * substitutes route params positionally, the way the real router resolves
 * `$param` segments, and `useRouterState` reports one fixed location.
 * `test/router.tsx` holds the component stand-ins over the same resolver.
 */

export type RouteParams = Record<string, string>
export type RouteSearch =
  | Record<string, unknown>
  | ((previous: object) => object)

export function resolveHref(
  to: string,
  params: RouteParams | undefined,
  search: RouteSearch | undefined
) {
  const pathname = Object.values(params ?? {}).reduce(
    (path, value) => path.replace(/\$\w+/, value),
    to
  )
  const resolved = typeof search === "function" ? search({}) : (search ?? {})
  const query = new URLSearchParams(
    Object.entries(resolved).map(([key, value]) => [key, String(value)])
  ).toString()

  return { href: query === "" ? pathname : `${pathname}?${query}`, pathname }
}

export const useRouter = () => ({
  buildLocation: ({
    params,
    search,
    to,
  }: {
    params?: RouteParams
    search?: RouteSearch
    to: string
  }) => resolveHref(to, params, search),
})

export const useRouterState = <Selected>({
  select,
}: {
  select: (state: { location: { pathname: string } }) => Selected
}) => select({ location: { pathname: "/" } })

/** A test is the client, and it has hydrated. */
export const useHydrated = () => true
