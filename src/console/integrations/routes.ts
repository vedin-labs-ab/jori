import {
  type Integration,
  isUserScopedIntegration,
} from "@contracts/integrations"

export const integrationTabs = [
  { label: "Organization", to: "/integrations", value: "organization" },
  { label: "Personal", to: "/integrations/personal", value: "personal" },
] as const

export type IntegrationTab = (typeof integrationTabs)[number]["value"]

/**
 * The tab to send someone to for a set of integrations they still need.
 *
 * A task can want a mix of scopes, so this aims at wherever most of the
 * remaining work is rather than demanding every integration agree. Ties and
 * empty sets fall to the organization tab: it is the page's default and the
 * one the sidebar already points at, so it is the least surprising landing.
 */
export function integrationsRouteFor(integrations: readonly Integration[]) {
  const personal = integrations.filter(isUserScopedIntegration).length

  return personal > integrations.length - personal
    ? "/integrations/personal"
    : "/integrations"
}
