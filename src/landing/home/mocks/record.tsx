import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { DemoConsole } from "../../demo/console"
import { chaseRunId } from "../../demo/fixtures/runs"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Jori, Section } from "../../section"

/** The record: the Activity page over Copperline's runs, with the chase
 *  job's run open, a live run to stop, and an approval to decide. */
export function Record() {
  const console = useDemoNavigation("/runs")

  return (
    <Section
      lede={
        <>
          Every run records what triggered it, what <Jori tilt="right" /> did,
          and what it cost. Open the activity log to review the work or stop a
          run.
        </>
      }
      title="Everything on the record"
    >
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
        <DemoConsole
          lazy
          className="h-[min(46rem,85svh)] md:h-[46rem]"
          navigation={console}
          openRunId={chaseRunId}
          sidebar={false}
        />
        <div>
          <dl className="space-y-8">
            <Definition term="See what happened">
              Each run shows the tools used, model calls, token usage, duration,
              and cost.
            </Definition>
            <Definition term="Ask first means ask you">
              Set a tool to ask first and Jori asks for approval before using
              it. Scheduled and event-triggered runs cannot use these tools.
            </Definition>
            <Definition term="Stop a run">
              Stop a run from the activity log. Its record shows who stopped it.
            </Definition>
          </dl>
          <Link
            className="mt-7 inline-flex items-center gap-1.5 py-1 font-medium text-primary text-sm hover:underline"
            to="/trust"
          >
            How Jori handles access and data
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </Section>
  )
}
