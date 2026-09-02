import { DemoConsole } from "../demo/console"
import { chaseRunId } from "../demo/fixtures/runs"
import { useDemoNavigation } from "../demo/navigation"
import { DemoWorkspaceProvider } from "../demo/provider"
import { ReleaseApprovalCard } from "../examples/approval"
import { Section } from "../section"

export function ApprovalsSection() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Set a tool to ask first and Jori requests before acting. Nothing runs until you approve it."
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
            where the work is: type approve YD4UEFNV in the thread and the
            action runs. Deny it, or let it expire, and it never does. Jori
            doesn't retry on its own.
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
      lede="What Jori read, what it did, what it asked: timestamped, on every run."
      title="Every run keeps receipts"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Every run lives in the console: what triggered it, which tools it
            used, what it produced, what it asked along the way, and the folder
            it was counted in. When Jori splits work into subtasks, each one
            links back to the run that started it.
          </p>
          <p className="max-w-xl">
            Receipts aren't a report Jori writes about itself. They're the
            record of what actually ran.
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
