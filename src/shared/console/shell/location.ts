import {
  type AnyRouter,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { createContext, useCallback, useContext } from "react"

// The seam between the console's views and the router. The views render
// under the router in the console itself, and under a local navigation
// wherever they show outside it — the landing page's mocks, say — so a
// view reads its path and moves between paths through this context rather
// than through the router directly.

/** A navigation standing in for the router: where the console is, and how
 *  a link moves it. */
export type ConsoleNavigation = {
  navigate: (href: string) => void
  pathname: string
}

/** Null, the default, is the router itself. */
export const ConsoleNavigationContext = createContext<ConsoleNavigation | null>(
  null
)

/** The path the console is on: the local navigation's when one is in
 *  force, the router's otherwise. */
export function useConsolePathname() {
  const navigation = useContext(ConsoleNavigationContext)
  const pathname = useRouterState({
    select: (state) =>
      state.matches.at(-1)?.pathname ?? state.location.pathname,
  })

  return navigation?.pathname ?? pathname
}

/** A destination the router can build into an href. */
export type ConsoleDestination = {
  to: string
  params?: Record<string, string>
  search?: Record<string, unknown>
}

/** Moves the console the way a plain click on a ConsoleLink would: the
 *  local navigation takes it when one is in force, the router otherwise.
 *  For the moves no link can carry — an arrow key, a finished action. */
export function useConsoleNavigate() {
  const navigation = useContext(ConsoleNavigationContext)
  const router = useRouter<AnyRouter>()

  return useCallback(
    (destination: ConsoleDestination) => {
      if (navigation === null) {
        void router.navigate(destination)
      } else {
        navigation.navigate(router.buildLocation(destination).href)
      }
    },
    [navigation, router]
  )
}
