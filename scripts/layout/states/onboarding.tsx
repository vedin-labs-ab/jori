import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type OrganizationDiscovery } from "@/console/context/organization/types"
import { OnboardingFlow } from "@/console/onboarding/flow"
import { OnboardingFrame } from "@/console/onboarding/frame"
import { organization } from "@/landing/demo/fixtures/organization"
import { SidebarOrganization } from "@/shared/console/shell/organization"

type Discovery = NonNullable<OrganizationDiscovery>

/** Onboarding with nothing behind it: `onboarding-<step>` stands alone,
 *  `onboarding-<step>-switcher` keeps the sidebar of a person with other
 *  organizations. The steps are name, details, website, working, ready,
 *  failed, profile (a click on from ready), and done (a click on from
 *  failed, or from profile); `-error` refuses whatever the step submits. */
export function OnboardingState({ state }: { state: string }) {
  const [, step, ...rest] = state.split("-")
  const switcher = rest.includes("switcher")
  const created = step !== "name"
  const submit = () =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (rest.includes("error")) {
          reject(new Error("Layout fixture refused this"))
        } else {
          resolve()
        }
      }, 1100)
    })

  return (
    // The app provides tooltips at its root; the fixture has no root.
    <TooltipProvider>
      <OnboardingFrame
        account={switcher ? null : <Button size="icon" variant="ghost" />}
        fresh={!created}
        pathname="/chat"
        switcher={
          switcher ? (
            <SidebarOrganization organization={organization} />
          ) : undefined
        }
      >
        <OnboardingFlow
          discovery={discoveries[step === "profile" ? "ready" : step] ?? null}
          logo={<SidebarOrganization organization={organization} />}
          name="Albin"
          onApprove={submit}
          onCancel={switcher ? () => undefined : undefined}
          onCreate={submit}
          onDeclareTimezone={submit}
          onDiscover={submit}
          onFinish={() => undefined}
          organization={created ? organization.name : undefined}
          proposal={
            step === "ready" || step === "profile" ? proposal : undefined
          }
          timezone={step === "details" ? undefined : "Europe/Stockholm"}
        />
      </OnboardingFrame>
    </TooltipProvider>
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

const proposal = {
  aliases: [],
  domains: ["copperline.example"],
  generatedAt: startedAt,
  name: "Copperline",
  sources: [
    { primary: true, url: "https://copperline.example/" },
    { primary: false, url: "https://copperline.example/pricing" },
  ],
  summary:
    "Copperline sells roofing and gutter work to homeowners across the Pacific Northwest, with fixed quotes and a ten-year workmanship guarantee.",
  website: "https://copperline.example/",
} as NonNullable<ComponentProps<typeof OnboardingFlow>["proposal"]>

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
