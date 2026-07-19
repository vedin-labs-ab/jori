import {
  Cable,
  CalendarClock,
  Component,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  NotebookTabs,
  Wallet,
} from "lucide-react"

export const consoleNavigation = [
  { icon: LayoutDashboard, label: "Overview", to: "/console" },
  { icon: ListChecks, label: "Runs", to: "/runs" },
  { icon: NotebookTabs, label: "Playbooks", to: "/playbooks" },
  { icon: CalendarClock, label: "Automations", to: "/automations" },
  { icon: Component, label: "Artifacts", to: "/artifacts" },
  { icon: Cable, label: "Integrations", to: "/integrations" },
  { icon: Library, label: "Skills", to: "/skills" },
  { icon: Layers, label: "Context", to: "/context" },
  { icon: Wallet, label: "Billing", to: "/billing" },
] as const

export function getPageTitle(pathname: string) {
  return (
    consoleNavigation.find((item) => isNavigationActive(pathname, item.to))
      ?.label ?? "Console"
  )
}

export function isNavigationActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}
