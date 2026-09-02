import { type ReactNode } from "react"
import { type RouteParams, type RouteSearch, resolveHref } from "./routing"

/**
 * Stand-ins for TanStack Router's components, for component tests that
 * render a link but do not mount a router: `Link` resolves its href the way
 * the router would, and `ClientOnly` renders its children at once, since a
 * test is the client. The hook stand-ins live in `test/routing.ts`.
 */

export const Link = ({
  params,
  search,
  to,
  ...props
}: {
  params?: RouteParams
  search?: RouteSearch
  to: string
} & React.ComponentProps<"a">) => (
  <a href={resolveHref(to, params, search).href} {...props} />
)

export const ClientOnly = ({ children }: { children: ReactNode }) => children
