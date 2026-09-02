import { integrationLabels, integrations } from "@contracts/integrations"
import { CircleDot } from "lucide-react"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Chip, Definition, Mention, Prop, Section } from "../section"

/** The multiplayer pillar, never named as one: one memory reachable from
 *  every surface is the demonstration. The mention props carry the "answers
 *  in the thread" half beside the terms that claim it. */
export function Surfaces() {
  return (
    <Section
      id="everywhere"
      lede="Mention it in Slack, GitHub, or Linear. Email it. Open the console. Every surface reaches the same teammate with the same memory, so nothing gets re-explained and nothing is stuck in one person's tab."
      title="Wherever you work, it's the same Jori"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <dl className="space-y-8">
            <Definition term="One memory">
              What one person teaches it, the whole company keeps. Corrections
              stick, and context carries over between surfaces.
            </Definition>
            <Definition term="Answers in the thread">
              Mention Jori where the work came up and the one-off job gets done
              right there, not in a separate tool someone has to open.
            </Definition>
            <Definition term="Sharper the longer it runs">
              Every run adds to what Jori knows about your company. This is the
              part a new tool can't copy on the day you switch.
            </Definition>
          </dl>
          <Integrations />
        </div>
        <div className="grid gap-4">
          <LinearMention />
          <GitHubMention />
        </div>
      </div>
    </Section>
  )
}

/** The tools Jori reaches, as a quality claim rather than a count: these are
 *  modeled, not merely connected. Naming that is what stops a short list
 *  reading as a short list. */
function Integrations() {
  return (
    <div className="mt-12">
      <p className="text-muted-foreground text-sm">
        Modeled in depth, not just connected.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        {integrations.map((integration) => (
          <Chip key={integration}>
            <IntegrationLogo
              className="size-3"
              decorative
              integration={integration}
            />
            {integrationLabels[integration]}
          </Chip>
        ))}
        {/* Dashed, the way this system already marks something that is not
            there yet. Depth first is the bet, but the list does grow, and a
            row that reads as closed says otherwise. */}
        <Chip className="border-dashed">+ more</Chip>
      </div>
    </div>
  )
}

// Each mention prop borrows its platform's signature markers (GitHub's repo
// path and open-issue dot, Linear's issue id and status ring), enough to read
// as that platform at a glance without cloning its UI.
//
// Two, and deliberately two. Four cards spent the page's least differentiated
// claim four times over, and three of them were the same question wearing
// different chrome.
//
// Linear rather than Slack for the second, because the jobs section
// below is already a Slack thread. A third tool on the page is worth more
// here than a third look at the same one.
function GitHubMention() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="github" />
          <span className="font-medium text-foreground">
            copperline/payroll
          </span>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <CircleDot className="size-3.5 shrink-0 text-[#1a7f37]" />
          <span className="font-medium">Payroll sync test is flaky on CI</span>
          <span className="text-muted-foreground">#491</span>
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <Mention /> can you fix this and open a PR?
        </p>
      </div>
    </Prop>
  )
}

function LinearMention() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="linear" />
          <span className="font-medium text-foreground">Copperline</span>
          <span className="ml-auto">COP</span>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <StatusInProgress />
          <span className="text-muted-foreground text-xs tabular-nums">
            COP-73
          </span>
          <span className="font-medium">Tip-pooling certification</span>
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <Mention /> what's left before this ships?
        </p>
      </div>
    </Prop>
  )
}

// Linear's yellow in-progress ring, approximated.
function StatusInProgress() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#f2c94c]"
    >
      <span className="size-1.5 rounded-full bg-[#f2c94c]" />
    </span>
  )
}
