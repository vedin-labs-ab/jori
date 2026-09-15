import { lazy, type ReactNode, type RefObject, Suspense, useState } from "react"
import { pageBindings, searchKeys } from "@/shared/console/discovery/bindings"
import {
  pages as consolePages,
  hitDestination,
} from "@/shared/console/discovery/results"
import { SearchTrigger } from "@/shared/console/discovery/trigger"
import {
  type ConsoleDestination,
  useConsoleNavigate,
} from "@/shared/console/shell/location"
import { consolePlatformNavigation } from "@/shared/console/shell/routes"
import { useShortcuts } from "@/shared/shortcuts"
import { chatViews } from "../derive/chat"
import { organization } from "../fixtures/organization"
import { useDemoWorkspace } from "../workspace"
import { demoResults } from "./results"

// Visitors who never open search don't need the command dialog.
const SearchPalette = lazy(async () => ({
  default: (await import("@/shared/console/discovery/palette")).SearchPalette,
}))
const platformPaths = new Set(consolePlatformNavigation.map((page) => page.to))
const pages = consolePages.map((page) => ({
  ...page,
  disabledReason: platformPaths.has(page.to)
    ? "Available in the full console."
    : undefined,
}))
const example = "renewal"

export function DemoSearch({
  children,
  scope,
}: {
  children: (trigger: ReactNode) => ReactNode
  scope: RefObject<HTMLDivElement | null>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(example)
  const { state } = useDemoWorkspace()
  const navigate = useConsoleNavigate()
  const changeOpen = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setQuery(example)
    }
  }
  const openPage = (destination: ConsoleDestination) => {
    changeOpen(false)
    navigate(destination)
  }
  useShortcuts(
    [
      { shortcut: searchKeys, allowInInput: true, run: () => changeOpen(true) },
      ...pageBindings(navigate, false, pages),
    ],
    { scope }
  )

  return (
    <>
      {children(<SearchTrigger onClick={() => changeOpen(true)} />)}
      {open ? (
        <Suspense fallback={null}>
          <SearchPalette
            chats={chatViews(state)}
            onOpenChange={changeOpen}
            onOpenHit={(hit) => openPage(hitDestination(hit))}
            onNavigate={openPage}
            onQueryChange={setQuery}
            onRetry={() => setQuery(example)}
            open={open}
            organizationName={organization.name}
            pages={pages}
            query={query}
            state={{
              status: "ready",
              hits: demoResults(state, query),
              partial: false,
            }}
          />
        </Suspense>
      ) : null}
    </>
  )
}
