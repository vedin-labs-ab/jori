import { Button } from "@/components/ui/button"
import { type OrganizationDiscovery } from "@/console/context/organization/types"
import { OnboardingFlow } from "@/console/onboarding/flow"
import { OnboardingFrame } from "@/console/onboarding/frame"
import { organization } from "@/landing/demo/fixtures/organization"
import { SidebarOrganization } from "@/shared/console/shell/organization"

type Discovery = NonNullable<OrganizationDiscovery>

/** Onboarding with nothing behind it: `onboarding-<step>` stands alone,
 *  `onboarding-<step>-switcher` keeps the sidebar of a person with other
 *  organizations. The steps are welcome, working, ready, and failed; the
 *  website step is one click in from welcome, and `website-error` refuses
 *  the address. */
export function OnboardingState({ state }: { state: string }) {
  const [, step, ...rest] = state.split("-")
  const switcher = rest.includes("switcher")

  return (
    <OnboardingFrame
      account={switcher ? null : <Button size="icon" variant="ghost" />}
      organization={organization.name}
      pathname="/chat"
      switcher={
        switcher ? (
          <SidebarOrganization organization={organization} />
        ) : undefined
      }
    >
      <OnboardingFlow
        discovery={discoveries[step] ?? null}
        name="Albin"
        onDiscover={() =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (rest.includes("error")) {
                reject(new Error("Layout fixture refused the website"))
              } else {
                resolve()
              }
            }, 1100)
          })
        }
        onFinish={() => undefined}
        organization={organization.name}
      />
    </OnboardingFrame>
  )
}

const startedAt = Date.now() - 12_000

const page = (seconds: number, path: string, done = true) => ({
  id: `page-${path}`,
  kind: "page" as const,
  label: `Reading copperline.example${path}`,
  startedAt: startedAt + seconds * 1000,
  url: `https://copperline.example${path}`,
  ...(done ? { completedAt: startedAt + (seconds + 4) * 1000 } : {}),
})

const discovery = (value: Partial<Discovery>): Discovery => ({
  _creationTime: 0,
  _id: "discovery" as Discovery["_id"],
  errors: [],
  organizationId: "organization",
  startedAt,
  status: "completed",
  steps: [],
  ...value,
})

const discoveries: Record<string, Discovery> = {
  working: discovery({
    status: "running",
    steps: [page(0, "/"), page(4, "/pricing"), page(8, "/about", false)],
  }),
  ready: discovery({
    endedAt: startedAt + 12_000,
    steps: [
      page(0, "/"),
      page(4, "/pricing"),
      {
        completedAt: startedAt + 12_000,
        id: "summary",
        kind: "summary",
        label: "Drafting profile",
        startedAt: startedAt + 8000,
      },
    ],
  }),
  failed: discovery({
    endedAt: startedAt + 4000,
    errors: ["Jori couldn't reach copperline.example."],
    steps: [page(0, "/")],
  }),
}
