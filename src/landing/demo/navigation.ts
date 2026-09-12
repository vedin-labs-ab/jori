import { useId, useMemo, useState } from "react"
import { type ConsoleNavigation } from "@/shared/console/shell/location"

/** Where a mock console is: its path, and the search it carries. */
export type DemoLocation = {
  pathname: string
  search: Record<string, string>
}

/** A navigation standing in for the router inside one mock: the links the
 *  views render point back to this mock, and a plain click moves this state
 *  instead of the page. */
export function useDemoNavigation(initialPathname: string) {
  const anchor = useId()
  const [location, setLocation] = useState<DemoLocation>({
    pathname: initialPathname,
    search: {},
  })
  const navigation = useMemo<ConsoleNavigation>(
    () => ({
      anchor,
      navigate: (href) => setLocation(parseHref(href)),
      pathname: location.pathname,
    }),
    [anchor, location.pathname]
  )

  return { location, navigation }
}

function parseHref(href: string): DemoLocation {
  const url = new URL(href, "https://demo.invalid")

  return {
    pathname: url.pathname,
    search: Object.fromEntries(url.searchParams),
  }
}

/** A mock console's navigation as its host holds it: where the console
 *  is, and the navigation that moves it, so something outside the box (a
 *  chip in a thread) can send the console somewhere too. */
export type DemoNavigation = ReturnType<typeof useDemoNavigation>
