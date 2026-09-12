import { CircleDotDashed } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ProviderLogo } from "@/shared/logo/provider"
import { DemoConsole } from "../demo/console"
import { chaseRunId } from "../demo/fixtures/runs"
import { useDemoNavigation } from "../demo/navigation"
import { DemoWorkspaceProvider } from "../demo/provider"
import { Jori, Prop, Section } from "../section"

export function ApprovalsSection() {
  return (
    <Section
      lede={
        <>
          Set a tool to ask first and <Jori tilt="slight" /> requests before
          acting. Nothing runs until you approve it.
        </>
      }
      title="Ask first means ask you"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* What happens to a gated tool on an unattended run belongs with the
            other structural guarantees, in `BoundariesSection`. Stating it
            here as well made the same promise twice on one page, which reads
            as padding on the one page that cannot afford it. */}
        <div className="text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Every request carries a code. Approve it from the console, or reply
            with the code in the thread where the work is, and the action runs.
            Deny it, or let it expire, and it never does. Jori doesn't retry on
            their own.
          </p>
        </div>
        <ReleaseApprovalCard />
      </div>
    </Section>
  )
}

export function ReceiptsSection() {
  return (
    <Section
      lede={
        <>
          What <Jori tilt="steep" /> read, what they did, what they asked:
          timestamped, on every run.
        </>
      }
      title="Every run keeps receipts"
    >
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Every run lives in the console with what triggered it, the tools it
            used, what it produced, and the folder it was counted in. When Jori
            splits work into subtasks, each one links back to the run that
            started it.
          </p>
          <p className="max-w-xl">
            A receipt is the record of what ran, not a summary written
            afterwards.
          </p>
        </div>
        {/* The record itself rather than a drawing of one: the console's
            Activity page over the demo workspace, with one run open. */}
        <DemoWorkspaceProvider>
          <ActivityRecord />
        </DemoWorkspaceProvider>
      </div>
    </Section>
  )
}

function ActivityRecord() {
  const console = useDemoNavigation("/runs")

  return (
    <DemoConsole
      className="h-[40rem]"
      navigation={console}
      openRunId={chaseRunId}
      sidebar={false}
    />
  )
}

/** An ask-first request as the requester sees it: what would run, on
 *  what, with the decision still theirs. The issue wears the mark the
 *  Activity page gives a Linear issue, and the channel its Slack mark. */
function ReleaseApprovalCard() {
  return (
    <Prop
      hint={
        <span className="inline-flex items-center gap-1.5">
          <ProviderLogo className="size-3" surface="slack" />
          #eng on Slack
        </span>
      }
      label="Approval requested"
    >
      <div className="px-5 py-4">
        <p className="flex items-center gap-2 font-medium text-sm">
          <ProviderLogo className="size-4" surface="linear" />
          Comment on the certification issue
        </p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground text-xs">
          <li className="flex items-center gap-1.5">
            <CircleDotDashed
              aria-hidden="true"
              className="size-3 shrink-0 text-muted-foreground/70"
            />
            COP-73 · Tip-pooling certification
          </li>
          <li>Asking Jonas which two signatures are missing</li>
        </ul>
        <div aria-hidden="true" className="mt-4 flex gap-2">
          <span className={buttonVariants({ size: "default" })}>Approve</span>
          <span className={buttonVariants({ variant: "outline" })}>Deny</span>
        </div>
      </div>
    </Prop>
  )
}
