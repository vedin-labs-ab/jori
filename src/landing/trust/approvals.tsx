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
          Set a tool to ask first and <Jori tilt="slight" /> waits for your
          approval before using it.
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
            Approve a request in the console, or reply with its code in the
            thread. If you deny the request or let it expire, Jori does not
            carry out the action or retry it on their own.
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
          See what <Jori tilt="steep" /> read, did, and asked for approval to
          do, with timestamps for each step.
        </>
      }
      title="Review the record of each run"
    >
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Each record shows what triggered the run, the tools it used, what it
            produced, and which folder its spending belongs to. If Jori splits
            work into subtasks, each links back to the original run.
          </p>
          <p className="max-w-xl">Jori records each step as the run happens.</p>
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
