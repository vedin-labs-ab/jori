import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsolePage } from "../page"

const contextTabs = [
  { label: "Organization", to: "/context", value: "organization" },
  { label: "Places", to: "/context/places", value: "places" },
] as const

type ContextTab = (typeof contextTabs)[number]["value"]

// Shared frame for the context tab routes: each tab is a child route under
// /context, so the active tab deep-links and survives reloads.
export function ContextPage({
  tab,
  children,
}: {
  tab: ContextTab
  children: (organizationId: string) => ReactNode
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <ContextLayout tab={tab}>{children(organizationId)}</ContextLayout>
      )}
    </ConsolePage>
  )
}

/** The page under the tab strip. A tab that wraps itself in more chrome,
 *  such as a filter panel, composes this inside its own ConsolePage. */
export function ContextLayout({
  tab,
  children,
}: {
  tab: ContextTab
  children: ReactNode
}) {
  return (
    <ConsolePageLayout>
      <Tabs value={tab}>
        <TabsList className="w-fit !h-7">
          {contextTabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value} asChild>
              <Link to={item.to}>{item.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </ConsolePageLayout>
  )
}
