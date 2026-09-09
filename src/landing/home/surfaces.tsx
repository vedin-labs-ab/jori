import { integrationLabels, integrations } from "@contracts/integrations"
import { CircleDot } from "lucide-react"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Organization } from "../demo/organization"
import { Chip, Jori, Mention, Prop, Section } from "../section"

/** The surfaces: a mention in a thread is the other way in, and what comes
 *  back lands in the same folders. The two cards are message surfaces, not
 *  console screens, so they stay drawn. */
export function Surfaces() {
  return (
    <Section
      lede={
        <>
          Mention <Jori tilt="right" /> in Slack, GitHub, or Linear and they
          answer in the thread. When the answer is a table, a store, or a file,
          it lands in the folder and the thread gets the link.
        </>
      }
      support
      title="The same Jori, wherever you work"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <Integrations />
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
    <div>
      <p className="text-muted-foreground text-sm">
        Each one modeled in depth, with its own tools and modes.
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
// different chrome. Linear and GitHub rather than Slack, because the hero is
// already a Slack thread.
function GitHubMention() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="github" />
          copperline/payroll
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
      hint="COP"
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="linear" />
          <Organization />
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
