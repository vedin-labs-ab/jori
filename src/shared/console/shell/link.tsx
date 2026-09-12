import {
  type AnyRouter,
  Link,
  type LinkComponent,
  type LinkComponentProps,
  useRouter,
} from "@tanstack/react-router"
import { type MouseEvent, useContext } from "react"
import { type ConsoleNavigation, ConsoleNavigationContext } from "./location"

/** The link every console view renders, typed exactly as the router's own
 *  Link. Under the router it is that Link, so preloading, active state,
 *  and modified clicks all keep working. Under a local navigation it is a
 *  plain anchor whose href the router still builds, so it reads as the
 *  real link, and whose plain left click the navigation takes instead of
 *  the browser. */
export const ConsoleLink: LinkComponent<"a"> = (props) => {
  const navigation = useContext(ConsoleNavigationContext)

  if (navigation === null) {
    return <Link {...props} />
  }

  // The route generics stop here: past this point the anchor needs only a
  // destination the router can build into an href.
  return <LocalLink navigation={navigation} {...(props as LocalLinkProps)} />
}

type LocalLinkProps = LinkComponentProps<
  "a",
  AnyRouter,
  string,
  string,
  string,
  string
>

function LocalLink({
  children,
  navigation,
  onClick,
  params,
  search,
  to,
  ...anchor
}: LocalLinkProps & { navigation: ConsoleNavigation }) {
  const router = useRouter<AnyRouter>()
  const location = router.buildLocation({ params, search, to })
  const isActive = location.pathname === navigation.pathname

  return (
    <a
      {...anchor}
      href={location.href}
      onClick={(event) => {
        onClick?.(event)

        if (isPlainLeftClick(event)) {
          event.preventDefault()
          navigation.navigate(location.href)
        }
      }}
    >
      {typeof children === "function" ? children({ isActive }) : children}
    </a>
  )
}

/** A click the browser would follow in this tab: no modifier asking for a
 *  new tab or window, and nothing upstream that already handled it. */
function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  )
}
